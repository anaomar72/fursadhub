package com.fursadhub.administration.domain;

import java.util.Map;

/**
 * Operational counts for the admin console (Phase 7 "Admin: platform operational statistics").
 *
 * <p>Counts only. Nothing here identifies a person, names an organization, or exposes a single
 * record — this is the health of the platform, not a window into its users, and an administrator who
 * needs to look at an actual record goes through the endpoint that authorizes that record.
 *
 * <p>The status breakdowns are maps keyed by the enum name so a new state added to a frozen machine
 * would surface here automatically rather than silently going uncounted.
 */
public record PlatformStatistics(
        Map<String, Long> usersByStatus,
        long universities,
        Map<String, Long> organizationsByVerificationStatus,
        Map<String, Long> opportunitiesByStatus,
        long candidacies,
        Map<String, Long> placementsByStatus,
        long openPrivacyRequests,
        long escalatedVerificationCases,
        /** Messages the outbox gave up on. A non-zero value means mail is not reaching people. */
        long failedEmailDeliveries,
        /** Login failures in the last 24 hours — the cheapest signal of credential-stuffing pressure. */
        long recentLoginFailures) {
}
