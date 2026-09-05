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
        /**
         * EVERY account, grouped by account status — students, tenant admins, tenant staff and
         * platform staff alike. The users table carries no account type, so this is not and must not
         * be labelled "students"; {@link #studentProfiles} is the real student figure.
         */
        Map<String, Long> usersByStatus,

        /**
         * Backend Phase B6. Rows in {@code student_profiles} — accounts that have actually created a
         * student profile, which is the closest thing FursadHub persists to "a student".
         *
         * <p>Counts every profile regardless of the account's status or whether an enrolment was ever
         * claimed, so a suspended student still counts. It is a population, not an activity measure.
         */
        long studentProfiles,

        /**
         * Backend Phase B6. Rows in {@code student_enrollments}, grouped by
         * {@code verification_status} ({@code StudentVerificationStatus}).
         *
         * <p>One enrolment per student (enforced by {@code uk_student_enrollments_student}), so this
         * also reads as "students by enrolment-verification state". Deliberately a breakdown rather
         * than a single "pending" scalar: {@code SUBMITTED}, {@code UNDER_REVIEW} and
         * {@code NEEDS_MORE_EVIDENCE} are genuinely different situations — two are waiting on a
         * reviewer, one is waiting on the student — and collapsing them would hide which.
         * {@code REVOKED} rows remain counted; a revoked enrolment is history, not a deletion.
         */
        Map<String, Long> studentEnrollmentsByVerificationStatus,

        /** EVERY university row, in any verification state, including SUSPENDED and REVOKED. */
        long universities,

        /**
         * Backend Phase B6. The same universities, grouped by {@code status}
         * ({@code InstitutionVerificationStatus}) — the breakdown the organizations figure has always
         * had and this one did not, so the two institution cards can finally be read the same way.
         */
        Map<String, Long> universitiesByVerificationStatus,

        Map<String, Long> organizationsByVerificationStatus,

        /**
         * EVERY opportunity, grouped by its own lifecycle status. {@code PUBLISHED} here means the
         * opportunity's stored state — NOT that anyone can see it. See
         * {@link #publiclyDiscoverableOpportunities}, which is a different and usually smaller number.
         */
        Map<String, Long> opportunitiesByStatus,

        /**
         * Backend Phase B6. Opportunities a visitor can actually find on the public site right now:
         * status {@code PUBLISHED} AND mode {@code PUBLIC}/{@code HYBRID} AND the owning organization
         * currently {@code VERIFIED} — bound to {@code PublicOpportunityVisibility}, the same rule the
         * public listing query applies.
         *
         * <p>Reported alongside {@code opportunitiesByStatus.PUBLISHED} rather than instead of it
         * because the GAP between them is the operationally interesting number: it is exactly the
         * listings hidden by Backend Phase B1.5 — university-targeted-only, or owned by a suspended
         * organization. An "active opportunities" metric would have hidden that distinction behind a
         * word that means neither thing precisely.
         */
        long publiclyDiscoverableOpportunities,

        /** EVERY candidacy ever created, in any state, including withdrawn and rejected. */
        long candidacies,

        /** EVERY placement, grouped by lifecycle status — ACTIVE and COMPLETED are keys here. */
        Map<String, Long> placementsByStatus,
        long openPrivacyRequests,
        long escalatedVerificationCases,
        /** Messages the outbox gave up on. A non-zero value means mail is not reaching people. */
        long failedEmailDeliveries,
        /** Login failures in the last 24 hours — the cheapest signal of credential-stuffing pressure. */
        long recentLoginFailures) {
}
