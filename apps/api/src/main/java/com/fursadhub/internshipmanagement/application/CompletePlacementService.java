package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiError;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.internshipmanagement.domain.CompletionRequirementStatus;
import com.fursadhub.internshipmanagement.domain.PlacementCompletionStatus;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * The placement completion transaction (Phase 6 sections 21-24).
 *
 * <p>Phase 5 built the COMPLETION_PENDING to COMPLETED transition on {@link Placement} but
 * deliberately exposed no endpoint for it, so that completion could be gated on requirements that
 * did not exist yet. This service is that gate.
 *
 * <p><strong>The transaction.</strong> Lock the placement, authorize, resolve the frozen policy,
 * evaluate only the ENABLED requirements, refuse with structured detail if any are unmet, otherwise
 * complete and audit — all in one transaction. Either every effect commits or none does.
 *
 * <p><strong>Student availability.</strong> There is nothing to update. Phase 4 derives availability
 * from a placement being live, enforced by the partial unique index
 * {@code uk_placements_one_live_per_student}, so moving to COMPLETED releases the student
 * automatically inside this same transaction with no second bookkeeping that could drift out of sync
 * (CLAUDE.md section 38).
 *
 * <p><strong>Idempotency.</strong> The row is read {@code FOR UPDATE}, so two simultaneous completion
 * requests are serialized by PostgreSQL: the first commits, the second then observes COMPLETED and
 * returns it unchanged rather than re-running the side effects or failing confusingly.
 */
@Service
public class CompletePlacementService {

    private final PlacementRepository placements;
    private final InternshipManagementAuthorization authorization;
    private final CompletionRequirementEvaluator evaluator;
    private final InternshipNotifier notifier;
    private final AuditService audit;

    public CompletePlacementService(
            PlacementRepository placements, InternshipManagementAuthorization authorization,
            CompletionRequirementEvaluator evaluator, InternshipNotifier notifier, AuditService audit) {
        this.placements = placements;
        this.authorization = authorization;
        this.evaluator = evaluator;
        this.notifier = notifier;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- read

    /**
     * The completion checklist, for every party attached to the placement.
     *
     * <p>This is the ONLY thing the frontend uses to decide what to display. It never re-derives
     * requirements from the policy itself, so the checklist a student sees and the rules
     * {@link #complete} enforces are literally the same computation.
     */
    @Transactional
    public PlacementCompletionStatus status(UUID actingUserId, UUID placementId) {
        Placement placement = authorization.requireCompletionReadAccess(actingUserId, placementId);
        return evaluator.evaluate(placement);
    }

    // ---------------------------------------------------------------- command

    /**
     * COMPLETION_PENDING to COMPLETED.
     *
     * <p>Only reachable from COMPLETION_PENDING — the domain transition table refuses everything else,
     * so an ACTIVE placement cannot skip the completion request and a TERMINATED one cannot be
     * resurrected as complete.
     */
    @Transactional
    public Placement complete(UUID actingUserId, UUID placementId, String ipAddress, String userAgent) {
        // Lock BEFORE authorizing and evaluating, so neither decision is made against a placement
        // another transaction is concurrently moving.
        Placement placement = authorization.lock(placementId);
        authorization.requireUniversityCompletionAuthority(actingUserId, placementId);

        if (placement.getStatus() == PlacementStatus.COMPLETED) {
            return placement;
        }
        if (placement.getStatus() != PlacementStatus.COMPLETION_PENDING) {
            throw new ApiException("PLACEMENT_INVALID_TRANSITION", HttpStatus.CONFLICT,
                    "Only a placement awaiting completion can be completed.");
        }

        PlacementCompletionStatus status = evaluator.evaluate(placement);
        if (!status.canComplete()) {
            throw requirementsNotMet(status.unmet());
        }

        placement.complete();
        placements.save(placement);

        audit.record("PLACEMENT_COMPLETED", actingUserId, ipAddress, userAgent,
                "placementId=" + placement.getId()
                        + ";studentUserId=" + placement.getStudentUserId()
                        + ";policySource=" + status.policy().source());
        notifier.placementCompleted(placement);
        return placement;
    }

    /**
     * Reports every unmet requirement at once, each with its own stable code, rather than a bare
     * "cannot complete" or the first failure only (Phase 6 section 24).
     *
     * <p>The frontend reads {@code fieldErrors} and lists exactly what is outstanding; it never has
     * to parse the English message, and a student is never sent away to fix one thing only to
     * discover another (CLAUDE.md section 11).
     */
    private ApiException requirementsNotMet(List<CompletionRequirementStatus> unmet) {
        List<ApiError.FieldError> details = unmet.stream()
                .map(requirement -> new ApiError.FieldError(
                        requirement.type().name(),
                        requirement.type().unmetCode(),
                        requirement.detail()))
                .toList();

        return new ApiException(
                "PLACEMENT_COMPLETION_REQUIREMENTS_NOT_MET", HttpStatus.CONFLICT,
                "This internship still has outstanding completion requirements.",
                details);
    }
}
