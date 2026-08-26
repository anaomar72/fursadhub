package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.internshipmanagement.domain.EvaluationState;
import com.fursadhub.internshipmanagement.domain.PlacementEvaluation;
import com.fursadhub.internshipmanagement.domain.PlacementEvaluationRepository;
import com.fursadhub.placement.domain.Placement;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Organization evaluation use cases (CLAUDE.md section 44, Phase 6 sections 11-13).
 *
 * <p><strong>Who may author.</strong> Only the ORGANIZATION supervisor actively assigned to this
 * placement. An organization admin or recruiter can read the evaluation — they already have Phase 5
 * read access to the placement — but cannot write one, because they did not supervise the student.
 * The student can never modify it, and sees it only once it is FINAL.
 *
 * <p><strong>Visibility.</strong> {@link #findVisibleTo} returns the evaluation only to callers
 * entitled to see it in its current state, so a student polling the endpoint during drafting learns
 * nothing about an assessment still being written.
 *
 * <p><strong>Concurrency.</strong> Exactly one evaluation per placement is guaranteed by
 * {@code uk_evaluation_placement}, so two supervisors starting a draft at the same moment cannot
 * create two. Every command re-reads the row {@code FOR UPDATE}, and finalize is idempotent, so a
 * double-clicked finalize cannot be applied twice or reopen a FINAL evaluation.
 */
@Service
public class PlacementEvaluationService {

    private final PlacementEvaluationRepository evaluations;
    private final InternshipManagementAuthorization authorization;
    private final InternshipPolicyResolver policyResolver;
    private final InternshipNotifier notifier;
    private final AuditService audit;

    public PlacementEvaluationService(
            PlacementEvaluationRepository evaluations, InternshipManagementAuthorization authorization,
            InternshipPolicyResolver policyResolver, InternshipNotifier notifier, AuditService audit) {
        this.evaluations = evaluations;
        this.authorization = authorization;
        this.policyResolver = policyResolver;
        this.notifier = notifier;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- read

    /**
     * The evaluation, if this caller is entitled to see it in its current state.
     *
     * <p>The student is deliberately shown nothing until the evaluation is FINAL: a draft is a
     * working document, and exposing it mid-assessment would change what supervisors are willing to
     * write down.
     */
    @Transactional(readOnly = true)
    public Optional<PlacementEvaluation> findVisibleTo(UUID actingUserId, UUID placementId) {
        Placement placement = authorization.requireWorkplaceReadAccess(actingUserId, placementId);
        Optional<PlacementEvaluation> evaluation = evaluations.findByPlacementId(placementId);

        if (authorization.isOwningStudent(actingUserId, placement)) {
            return evaluation.filter(PlacementEvaluation::isVisibleToStudent);
        }
        return evaluation;
    }

    // ---------------------------------------------------------------- supervisor commands

    /**
     * Creates the draft on first call and updates it thereafter — one endpoint, because "start
     * writing" and "keep writing" are the same action from the supervisor's point of view.
     */
    @Transactional
    public PlacementEvaluation saveDraft(
            UUID actingUserId, UUID placementId, Short professionalism, Short reliability,
            Short communication, Short workPerformance, Short teamwork, Short overall,
            String strengths, String improvementAreas, String finalComments) {
        Placement placement =
                authorization.requireAssignedOrganizationSupervisorOnRunningPlacement(actingUserId, placementId);
        policyResolver.resolveAndFreeze(placement);

        PlacementEvaluation evaluation = evaluations.findByPlacementIdForUpdate(placementId)
                .orElseGet(() -> createDraft(placementId, actingUserId));

        evaluation.edit(professionalism, reliability, communication, workPerformance, teamwork, overall,
                strengths, improvementAreas, finalComments);
        return evaluations.save(evaluation);
    }

    /** DRAFT to SUBMITTED. Every rating must be present. Idempotent. */
    @Transactional
    public PlacementEvaluation submit(UUID actingUserId, UUID placementId, String ipAddress, String userAgent) {
        authorization.requireAssignedOrganizationSupervisorOnRunningPlacement(actingUserId, placementId);
        PlacementEvaluation evaluation = lock(placementId);

        if (evaluation.getState() != EvaluationState.DRAFT) {
            return evaluation;
        }
        evaluation.submit();
        evaluations.save(evaluation);

        audit.record("EVALUATION_SUBMITTED", actingUserId, ipAddress, userAgent, metadata(evaluation));
        return evaluation;
    }

    /**
     * SUBMITTED to FINAL. Terminal — a FINAL evaluation can never be edited or reopened, and
     * repeating the command returns it unchanged rather than re-stamping who finalized it.
     */
    @Transactional
    public PlacementEvaluation finalizeEvaluation(
            UUID actingUserId, UUID placementId, String ipAddress, String userAgent) {
        Placement placement =
                authorization.requireAssignedOrganizationSupervisorOnRunningPlacement(actingUserId, placementId);
        PlacementEvaluation evaluation = lock(placementId);

        if (evaluation.getState() == EvaluationState.FINAL) {
            return evaluation;
        }
        evaluation.markFinal(actingUserId);
        evaluations.save(evaluation);

        audit.record("EVALUATION_FINALIZED", actingUserId, ipAddress, userAgent, metadata(evaluation));
        notifier.evaluationFinalized(placement);
        return evaluation;
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Inserts the draft immediately, so two supervisors starting one at the same moment collide on
     * {@code uk_evaluation_placement} here rather than producing two rows.
     */
    private PlacementEvaluation createDraft(UUID placementId, UUID evaluatorUserId) {
        try {
            return evaluations.saveAndFlush(PlacementEvaluation.createDraft(placementId, evaluatorUserId));
        } catch (DataIntegrityViolationException e) {
            return evaluations.findByPlacementIdForUpdate(placementId).orElseThrow(() -> e);
        }
    }

    private PlacementEvaluation lock(UUID placementId) {
        return evaluations.findByPlacementIdForUpdate(placementId)
                .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "No evaluation has been started for this placement."));
    }

    /** Safe identifiers only — never the ratings or the supervisor's written assessment. */
    private String metadata(PlacementEvaluation evaluation) {
        return "evaluationId=" + evaluation.getId()
                + ";placementId=" + evaluation.getPlacementId()
                + ";state=" + evaluation.getState();
    }
}
