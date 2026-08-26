package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.internshipmanagement.domain.WeeklyLog;
import com.fursadhub.internshipmanagement.domain.WeeklyLogPeriods;
import com.fursadhub.internshipmanagement.domain.WeeklyLogRepository;
import com.fursadhub.internshipmanagement.domain.WeeklyLogState;
import com.fursadhub.placement.domain.Placement;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Weekly-log use cases (CLAUDE.md section 42, Phase 6 sections 5-7).
 *
 * <p>Every transition is a named command. There is deliberately no generic "update state" path, so
 * a client cannot mark its own log REVIEWED, and the state machine itself lives on {@link WeeklyLog}
 * rather than being reimplemented here.
 *
 * <p><strong>Who does what.</strong> The student writes and submits their own logs and can never
 * review one — not even their own. Review and return belong to university staff in scope for the
 * placement. Organization staff have no access to weekly logs at all; see
 * {@link InternshipManagementAuthorization} for why.
 *
 * <p><strong>Concurrency.</strong> Creation relies on {@code uk_weekly_logs_placement_week} rather
 * than a check-then-insert, so a double-submitted "create week 3" produces one log and one clean
 * error instead of two rows. Every mutating command re-reads the log {@code FOR UPDATE}, so two
 * simultaneous reviews are serialized and the second observes what the first actually did.
 */
@Service
public class WeeklyLogService {

    private final WeeklyLogRepository logs;
    private final InternshipManagementAuthorization authorization;
    private final InternshipPolicyResolver policyResolver;
    private final InternshipNotifier notifier;
    private final AuditService audit;

    public WeeklyLogService(
            WeeklyLogRepository logs, InternshipManagementAuthorization authorization,
            InternshipPolicyResolver policyResolver, InternshipNotifier notifier, AuditService audit) {
        this.logs = logs;
        this.authorization = authorization;
        this.policyResolver = policyResolver;
        this.notifier = notifier;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- read

    @Transactional(readOnly = true)
    public List<WeeklyLog> list(UUID actingUserId, UUID placementId) {
        authorization.requireAcademicReadAccess(actingUserId, placementId);
        return logs.findByPlacementIdOrderByWeekNumber(placementId);
    }

    /** Expected week count for the placement, so the UI can offer only weeks that exist. */
    @Transactional(readOnly = true)
    public int expectedWeekCount(UUID actingUserId, UUID placementId) {
        Placement placement = authorization.requireAcademicReadAccess(actingUserId, placementId);
        return periods(placement).expectedWeekCount();
    }

    // ---------------------------------------------------------------- student commands

    /**
     * Creates a DRAFT log for one week of the student's own placement.
     *
     * <p>The period is DERIVED from the placement's start date and the week number, never taken from
     * the request: a client that could choose its own period could file a log covering dates outside
     * the internship, which the completion check would then be unable to reconcile.
     */
    @Transactional
    public WeeklyLog create(
            UUID studentUserId, UUID placementId, int weekNumber, String summary, String activities,
            String challenges, String learningOutcomes) {
        Placement placement = authorization.requireOwningStudentOnRunningPlacement(studentUserId, placementId);
        // Freezes the placement's requirements on first activity (Phase 6 section 4).
        policyResolver.resolveAndFreeze(placement);

        WeeklyLogPeriods periods = periods(placement);
        periods.requireValidWeek(weekNumber);
        WeeklyLogPeriods.Period period = periods.periodFor(weekNumber);

        WeeklyLog log = WeeklyLog.createDraft(
                placementId, weekNumber, period.start(), period.end(),
                summary, activities, challenges, learningOutcomes);
        try {
            return logs.saveAndFlush(log);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException("WEEKLY_LOG_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "A log for that week already exists.");
        }
    }

    /** Edits the student's own DRAFT or RETURNED_FOR_CHANGES log. */
    @Transactional
    public WeeklyLog edit(
            UUID studentUserId, UUID logId, String summary, String activities, String challenges,
            String learningOutcomes) {
        WeeklyLog log = lockOwnLog(studentUserId, logId);
        log.edit(summary, activities, challenges, learningOutcomes);
        return logs.save(log);
    }

    /**
     * DRAFT or RETURNED_FOR_CHANGES to SUBMITTED.
     *
     * <p>Repeating this on an already SUBMITTED log returns it unchanged rather than failing, so a
     * retried or double-clicked request is harmless.
     */
    @Transactional
    public WeeklyLog submit(UUID studentUserId, UUID logId, String ipAddress, String userAgent) {
        WeeklyLog log = lockOwnLog(studentUserId, logId, true);
        if (log.getState() == WeeklyLogState.SUBMITTED) {
            return log;
        }
        log.submit();
        logs.save(log);

        audit.record("WEEKLY_LOG_SUBMITTED", studentUserId, ipAddress, userAgent, metadata(log));
        return log;
    }

    // ---------------------------------------------------------------- supervisor commands

    /** SUBMITTED to REVIEWED, by an authorized university actor. Idempotent. */
    @Transactional
    public WeeklyLog review(UUID actingUserId, UUID logId, String comment, String ipAddress, String userAgent) {
        WeeklyLog log = lockForReview(actingUserId, logId);
        if (log.getState() == WeeklyLogState.REVIEWED) {
            return log;
        }
        log.review(actingUserId, comment);
        logs.save(log);

        audit.record("WEEKLY_LOG_REVIEWED", actingUserId, ipAddress, userAgent, metadata(log));
        notifier.weeklyLogReviewed(authorization.getOrThrow(log.getPlacementId()), log.getWeekNumber());
        return log;
    }

    /** SUBMITTED to RETURNED_FOR_CHANGES. The comment is required — a return without one is unhelpful. */
    @Transactional
    public WeeklyLog returnForChanges(
            UUID actingUserId, UUID logId, String comment, String ipAddress, String userAgent) {
        if (comment == null || comment.isBlank()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Explain what the student needs to change.");
        }
        WeeklyLog log = lockForReview(actingUserId, logId);
        if (log.getState() == WeeklyLogState.RETURNED_FOR_CHANGES) {
            return log;
        }
        log.returnForChanges(actingUserId, comment);
        logs.save(log);

        audit.record("WEEKLY_LOG_RETURNED", actingUserId, ipAddress, userAgent, metadata(log));
        notifier.weeklyLogReturned(authorization.getOrThrow(log.getPlacementId()), log.getWeekNumber());
        return log;
    }

    // ---------------------------------------------------------------- helpers

    private WeeklyLog lockOwnLog(UUID studentUserId, UUID logId) {
        return lockOwnLog(studentUserId, logId, false);
    }

    /**
     * Locks the log, then verifies the caller owns the placement it belongs to.
     *
     * <p>A log on someone else's placement is reported as NOT FOUND, matching the rest of the
     * codebase: FORBIDDEN would confirm the id exists.
     */
    private WeeklyLog lockOwnLog(UUID studentUserId, UUID logId, boolean allowSubmitted) {
        WeeklyLog log = logs.findByIdForUpdate(logId).orElseThrow(this::logNotFound);
        // Throws PLACEMENT_NOT_FOUND if this log belongs to someone else's placement.
        authorization.requireOwningStudentOnRunningPlacement(studentUserId, log.getPlacementId());

        if (!allowSubmitted && !log.isEditable()) {
            throw new ApiException("WEEKLY_LOG_INVALID_TRANSITION", HttpStatus.CONFLICT,
                    "This log can no longer be edited.");
        }
        return log;
    }

    /**
     * Locks the log, then verifies the caller is university staff in scope for its placement.
     *
     * <p>The student can never reach this path even on their own log, because ownership grants no
     * university scope — "cannot review own log" falls out of the authorization model rather than
     * needing a special case.
     */
    private WeeklyLog lockForReview(UUID actingUserId, UUID logId) {
        WeeklyLog log = logs.findByIdForUpdate(logId).orElseThrow(this::logNotFound);
        authorization.requireUniversityAcademicAccess(actingUserId, log.getPlacementId());
        return log;
    }

    private WeeklyLogPeriods periods(Placement placement) {
        return new WeeklyLogPeriods(placement.getStartDate(), placement.getEndDate());
    }

    private ApiException logNotFound() {
        return new ApiException("WEEKLY_LOG_NOT_FOUND", HttpStatus.NOT_FOUND, "Weekly log not found.");
    }

    /** Safe identifiers only — never the student's written content (CLAUDE.md section 68). */
    private String metadata(WeeklyLog log) {
        return "weeklyLogId=" + log.getId()
                + ";placementId=" + log.getPlacementId()
                + ";week=" + log.getWeekNumber()
                + ";state=" + log.getState();
    }
}
