package com.fursadhub.internshipmanagement.application;

import com.fursadhub.internshipmanagement.domain.AttendanceRecordRepository;
import com.fursadhub.internshipmanagement.domain.CompletionRequirementStatus;
import com.fursadhub.internshipmanagement.domain.CompletionRequirementType;
import com.fursadhub.internshipmanagement.domain.DefenseAttemptRepository;
import com.fursadhub.internshipmanagement.domain.FinalReport;
import com.fursadhub.internshipmanagement.domain.FinalReportRepository;
import com.fursadhub.internshipmanagement.domain.PlacementCompletionStatus;
import com.fursadhub.internshipmanagement.domain.PlacementEvaluation;
import com.fursadhub.internshipmanagement.domain.PlacementEvaluationRepository;
import com.fursadhub.internshipmanagement.domain.ResolvedInternshipPolicy;
import com.fursadhub.internshipmanagement.domain.WeeklyLogPeriods;
import com.fursadhub.internshipmanagement.domain.WeeklyLogRepository;
import com.fursadhub.internshipmanagement.domain.WeeklyLogState;
import com.fursadhub.placement.domain.Placement;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Decides whether a placement's enabled completion requirements are satisfied (Phase 6 sections
 * 21-22).
 *
 * <p>This class is the single source of truth for those rules. The completion command and the
 * checklist the UI renders both call it, so what a student is told and what the backend enforces
 * cannot drift apart.
 *
 * <p><strong>Disabled requirements never block completion.</strong> Nothing here hardcodes "all five
 * are always required"; each rule is consulted only if the placement's frozen policy asks for it, and
 * a disabled requirement is reported as {@code required=false} so the UI can hide it rather than
 * render it as an unmet item.
 *
 * <p><strong>Each rule is explicit and testable</strong>, and none of them invents a university
 * regulation:
 * <ul>
 *   <li><em>Weekly logs</em> — every expected week must be REVIEWED. The expected count comes from
 *       the placement's own dates ({@link WeeklyLogPeriods}), not from a configured number, because
 *       no such number is frozen anywhere. REVIEWED is the accepted state; a log still SUBMITTED is
 *       waiting on the supervisor and one RETURNED_FOR_CHANGES is waiting on the student.</li>
 *   <li><em>Attendance</em> — at least one record exists and NONE is left unsettled. There is
 *       deliberately no percentage threshold: no attendance rate is frozen in any FursadHub document,
 *       so this validates workflow completeness (every record confirmed or its dispute resolved)
 *       instead of inventing a pass mark. An ABSENT day does not block completion; an unanswered
 *       dispute does.</li>
 *   <li><em>Organization evaluation</em> — must be FINAL. SUBMITTED is not enough.</li>
 *   <li><em>Final report</em> — must be APPROVED.</li>
 *   <li><em>Defense</em> — at least one COMPLETED attempt with result PASSED. FAILED and
 *       RETAKE_REQUIRED do not satisfy it, and a still-SCHEDULED attempt does not either.</li>
 * </ul>
 */
@Service
public class CompletionRequirementEvaluator {

    private final InternshipPolicyResolver policyResolver;
    private final WeeklyLogRepository weeklyLogs;
    private final AttendanceRecordRepository attendance;
    private final PlacementEvaluationRepository evaluations;
    private final FinalReportRepository finalReports;
    private final DefenseAttemptRepository defenseAttempts;

    public CompletionRequirementEvaluator(
            InternshipPolicyResolver policyResolver,
            WeeklyLogRepository weeklyLogs,
            AttendanceRecordRepository attendance,
            PlacementEvaluationRepository evaluations,
            FinalReportRepository finalReports,
            DefenseAttemptRepository defenseAttempts) {
        this.policyResolver = policyResolver;
        this.weeklyLogs = weeklyLogs;
        this.attendance = attendance;
        this.evaluations = evaluations;
        this.finalReports = finalReports;
        this.defenseAttempts = defenseAttempts;
    }

    @Transactional
    public PlacementCompletionStatus evaluate(Placement placement) {
        ResolvedInternshipPolicy policy = policyResolver.resolveAndFreeze(placement);

        List<CompletionRequirementStatus> statuses = new ArrayList<>();
        statuses.add(weeklyLogStatus(placement, policy));
        statuses.add(attendanceStatus(placement, policy));
        statuses.add(evaluationStatus(placement, policy));
        statuses.add(finalReportStatus(placement, policy));
        statuses.add(defenseStatus(placement, policy));

        return new PlacementCompletionStatus(policy, List.copyOf(statuses));
    }

    // ---------------------------------------------------------------- individual rules

    private CompletionRequirementStatus weeklyLogStatus(Placement placement, ResolvedInternshipPolicy policy) {
        CompletionRequirementType type = CompletionRequirementType.WEEKLY_LOGS;
        if (!policy.requires(type)) {
            return CompletionRequirementStatus.notRequired(type);
        }
        int expected = new WeeklyLogPeriods(placement.getStartDate(), placement.getEndDate()).expectedWeekCount();
        long reviewed = weeklyLogs.countByPlacementIdAndState(placement.getId(), WeeklyLogState.REVIEWED);
        return CompletionRequirementStatus.of(type, reviewed >= expected, reviewed + "/" + expected);
    }

    private CompletionRequirementStatus attendanceStatus(Placement placement, ResolvedInternshipPolicy policy) {
        CompletionRequirementType type = CompletionRequirementType.ATTENDANCE;
        if (!policy.requires(type)) {
            return CompletionRequirementStatus.notRequired(type);
        }
        long total = attendance.countByPlacementId(placement.getId());
        long unsettled = attendance.countUnsettledByPlacementId(placement.getId());
        boolean satisfied = total > 0 && unsettled == 0;
        return CompletionRequirementStatus.of(type, satisfied, (total - unsettled) + "/" + total);
    }

    private CompletionRequirementStatus evaluationStatus(Placement placement, ResolvedInternshipPolicy policy) {
        CompletionRequirementType type = CompletionRequirementType.ORGANIZATION_EVALUATION;
        if (!policy.requires(type)) {
            return CompletionRequirementStatus.notRequired(type);
        }
        var evaluation = evaluations.findByPlacementId(placement.getId());
        boolean satisfied = evaluation.map(PlacementEvaluation::countsTowardsCompletion).orElse(false);
        String detail = evaluation.map(e -> e.getState().name()).orElse("MISSING");
        return CompletionRequirementStatus.of(type, satisfied, detail);
    }

    private CompletionRequirementStatus finalReportStatus(Placement placement, ResolvedInternshipPolicy policy) {
        CompletionRequirementType type = CompletionRequirementType.FINAL_REPORT;
        if (!policy.requires(type)) {
            return CompletionRequirementStatus.notRequired(type);
        }
        var report = finalReports.findByPlacementId(placement.getId());
        boolean satisfied = report.map(FinalReport::countsTowardsCompletion).orElse(false);
        String detail = report.map(r -> r.getState().name()).orElse("MISSING");
        return CompletionRequirementStatus.of(type, satisfied, detail);
    }

    private CompletionRequirementStatus defenseStatus(Placement placement, ResolvedInternshipPolicy policy) {
        CompletionRequirementType type = CompletionRequirementType.DEFENSE;
        if (!policy.requires(type)) {
            return CompletionRequirementStatus.notRequired(type);
        }
        boolean passed = defenseAttempts.existsPassedByPlacementId(placement.getId());
        String detail = passed ? "PASSED" : (defenseAttempts.highestAttemptNumber(placement.getId()) == 0
                ? "MISSING" : "NOT_PASSED");
        return CompletionRequirementStatus.of(type, passed, detail);
    }
}
