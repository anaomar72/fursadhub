package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.internshipmanagement.domain.DefenseAttempt;
import com.fursadhub.internshipmanagement.domain.DefenseAttemptRepository;
import com.fursadhub.internshipmanagement.domain.DefenseResult;
import com.fursadhub.placement.domain.Placement;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Defense use cases (CLAUDE.md section 46, Phase 6 sections 18-20).
 *
 * <p><strong>History is never rewritten.</strong> A retake creates a NEW attempt; the previous one
 * keeps its state, result and panel notes forever. There is no command that reopens a completed
 * attempt, and none that renumbers or deletes one, so the record of how many times a student
 * defended and what happened each time survives intact.
 *
 * <p><strong>Who does what.</strong> Defense is academic, so only university staff in scope for the
 * placement schedule it, cancel it or record its result. A student sees their own schedule and result
 * and can never record an outcome — the authorization model gives them no university scope, so that
 * falls out of the design rather than needing a special case. Organization users have no access.
 *
 * <p><strong>Concurrency.</strong> The next attempt number is computed and inserted under a lock on
 * the placement row, and {@code uk_defense_placement_attempt} is the hard guarantee behind it: two
 * staff scheduling a retake simultaneously both compute the same number, only one commits, and the
 * other is told so rather than creating a duplicate attempt 2.
 */
@Service
public class DefenseService {

    private final DefenseAttemptRepository attempts;
    private final InternshipManagementAuthorization authorization;
    private final InternshipPolicyResolver policyResolver;
    private final InternshipNotifier notifier;
    private final AuditService audit;

    public DefenseService(
            DefenseAttemptRepository attempts, InternshipManagementAuthorization authorization,
            InternshipPolicyResolver policyResolver, InternshipNotifier notifier, AuditService audit) {
        this.attempts = attempts;
        this.authorization = authorization;
        this.policyResolver = policyResolver;
        this.notifier = notifier;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- read

    /** Every attempt ever made, oldest first — cancelled and failed ones included. */
    @Transactional(readOnly = true)
    public List<DefenseAttempt> history(UUID actingUserId, UUID placementId) {
        authorization.requireAcademicReadAccess(actingUserId, placementId);
        return attempts.findByPlacementIdOrderByAttemptNumber(placementId);
    }

    // ---------------------------------------------------------------- university commands

    /**
     * Schedules the next attempt.
     *
     * <p>Refuses while another attempt is still SCHEDULED: two open sittings for one placement is
     * not a state the university means to be in, and allowing it would make "which defense is the
     * student attending?" ambiguous. Cancel the open one first, or record its result.
     */
    @Transactional
    public DefenseAttempt schedule(
            UUID actingUserId, UUID placementId, Instant scheduledAt, String locationDetails,
            String ipAddress, String userAgent) {
        // Locks the placement first, so the "next attempt number" read below cannot race another
        // scheduler between its count and its insert.
        Placement placement = authorization.lock(placementId);
        authorization.requireUniversityAcademicAccess(actingUserId, placementId);
        policyResolver.resolveAndFreeze(placement);

        if (attempts.existsOpenByPlacementId(placementId)) {
            throw new ApiException("DEFENSE_ATTEMPT_ALREADY_OPEN", HttpStatus.CONFLICT,
                    "A defense is already scheduled for this placement.");
        }

        int nextNumber = attempts.highestAttemptNumber(placementId) + 1;
        DefenseAttempt attempt = DefenseAttempt.schedule(
                placementId, nextNumber, scheduledAt, locationDetails, actingUserId);
        try {
            attempts.saveAndFlush(attempt);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException("DEFENSE_ATTEMPT_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "That defense attempt has already been created.");
        }

        audit.record("DEFENSE_SCHEDULED", actingUserId, ipAddress, userAgent, metadata(attempt));
        notifier.defenseScheduled(placement, nextNumber);
        return attempt;
    }

    /** SCHEDULED to CANCELLED. The attempt row survives; it simply never took place. Idempotent. */
    @Transactional
    public DefenseAttempt cancel(UUID actingUserId, UUID attemptId, String ipAddress, String userAgent) {
        DefenseAttempt attempt = lockForUniversity(actingUserId, attemptId);
        if (!attempt.isOpen()) {
            if (attempt.getState() == com.fursadhub.internshipmanagement.domain.DefenseAttemptState.CANCELLED) {
                return attempt;
            }
            throw new ApiException("DEFENSE_INVALID_TRANSITION", HttpStatus.CONFLICT,
                    "A completed defense attempt cannot be cancelled.");
        }
        attempt.cancel();
        attempts.save(attempt);

        audit.record("DEFENSE_CANCELLED", actingUserId, ipAddress, userAgent, metadata(attempt));
        return attempt;
    }

    /**
     * SCHEDULED to COMPLETED, with the panel's verdict.
     *
     * <p>A RETAKE_REQUIRED or FAILED outcome does NOT reopen this attempt. The university schedules a
     * new attempt afterwards, and this one stays exactly as recorded.
     */
    @Transactional
    public DefenseAttempt recordResult(
            UUID actingUserId, UUID attemptId, DefenseResult result, String panelNotes,
            String ipAddress, String userAgent) {
        DefenseAttempt attempt = lockForUniversity(actingUserId, attemptId);
        Placement placement = authorization.getOrThrow(attempt.getPlacementId());

        attempt.recordResult(result, panelNotes, actingUserId);
        attempts.save(attempt);

        audit.record("DEFENSE_RESULT_RECORDED", actingUserId, ipAddress, userAgent, metadata(attempt));
        notifier.defenseResultRecorded(placement, attempt.getAttemptNumber());
        return attempt;
    }

    // ---------------------------------------------------------------- helpers

    private DefenseAttempt lockForUniversity(UUID actingUserId, UUID attemptId) {
        DefenseAttempt attempt = attempts.findByIdForUpdate(attemptId).orElseThrow(this::notFound);
        authorization.requireUniversityAcademicAccess(actingUserId, attempt.getPlacementId());
        return attempt;
    }

    private ApiException notFound() {
        return new ApiException("DEFENSE_ATTEMPT_NOT_FOUND", HttpStatus.NOT_FOUND, "Defense attempt not found.");
    }

    /** Safe identifiers only — never the panel's written notes. */
    private String metadata(DefenseAttempt attempt) {
        return "defenseAttemptId=" + attempt.getId()
                + ";placementId=" + attempt.getPlacementId()
                + ";attempt=" + attempt.getAttemptNumber()
                + ";state=" + attempt.getState()
                + ";result=" + attempt.getResult();
    }
}
