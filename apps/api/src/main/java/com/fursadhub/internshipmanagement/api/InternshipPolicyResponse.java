package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.ResolvedInternshipPolicy;

/**
 * What currently applies at a level, plus WHERE it came from.
 *
 * <p>{@code source} lets the UI say "this department follows the university default" instead of
 * presenting inherited values as if the department had configured them itself.
 */
public record InternshipPolicyResponse(
        boolean weeklyLogsRequired,
        boolean attendanceRequired,
        boolean organizationEvaluationRequired,
        boolean finalReportRequired,
        boolean defenseRequired,
        String source) {

    public static InternshipPolicyResponse from(ResolvedInternshipPolicy policy) {
        return new InternshipPolicyResponse(
                policy.weeklyLogsRequired(),
                policy.attendanceRequired(),
                policy.organizationEvaluationRequired(),
                policy.finalReportRequired(),
                policy.defenseRequired(),
                policy.source().name());
    }
}
