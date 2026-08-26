package com.fursadhub.internshipmanagement.domain;

import java.util.UUID;

/**
 * The five completion requirements that actually apply to one placement, after precedence has been
 * resolved (CLAUDE.md section 41).
 *
 * <p>A value object, not an entity: it is either read from a frozen {@link PlacementPolicySnapshot}
 * or computed once from the configured {@link InternshipPolicy} rows. Nothing downstream needs to
 * know which, so nothing downstream can accidentally re-resolve a historical placement against
 * today's configuration.
 */
public record ResolvedInternshipPolicy(
        boolean weeklyLogsRequired,
        boolean attendanceRequired,
        boolean organizationEvaluationRequired,
        boolean finalReportRequired,
        boolean defenseRequired,
        PolicySource source,
        UUID sourcePolicyId) {

    /**
     * What applies when a university has configured nothing at all.
     *
     * <p>Every requirement is DISABLED. FursadHub does not know any university's academic
     * regulations, and inventing them would mean silently blocking real internships from completing
     * on rules nobody agreed to. A university that wants requirements enables them explicitly.
     */
    public static ResolvedInternshipPolicy platformDefault() {
        return new ResolvedInternshipPolicy(false, false, false, false, false,
                PolicySource.PLATFORM_DEFAULT, null);
    }

    public boolean requires(CompletionRequirementType type) {
        return switch (type) {
            case WEEKLY_LOGS -> weeklyLogsRequired;
            case ATTENDANCE -> attendanceRequired;
            case ORGANIZATION_EVALUATION -> organizationEvaluationRequired;
            case FINAL_REPORT -> finalReportRequired;
            case DEFENSE -> defenseRequired;
        };
    }
}
