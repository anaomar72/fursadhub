package com.fursadhub.administration.api;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.PublicOpportunityVisibility;
import com.fursadhub.organization.domain.Organization;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One opportunity as a platform administrator sees it in a list (Backend Phase B6).
 *
 * <p><strong>Purpose-built, not a reused public DTO.</strong> {@code PublicOpportunityResponse} is
 * shaped for a student deciding whether to apply; this is shaped for an operator deciding whether
 * something is wrong. So it carries {@code status} and {@code createdAt}, which the public DTO must
 * never expose, and omits the long authored prose, which a table row cannot show anyway.
 *
 * <p><strong>What is deliberately absent.</strong> Nothing here touches the people around an
 * opportunity: no applicants, no candidacy counts, no screening questions or answers, no student
 * data, no verification evidence, no stored-file identifiers, and no {@code createdBy}. B6 is
 * opportunity oversight, not candidacy investigation — an administrator who needs a record about a
 * person goes through the endpoint that authorizes that record. The DTO has no field for such data,
 * which is a stronger guarantee than remembering not to populate one.
 */
public record AdminOpportunitySummaryResponse(
        UUID id,
        UUID organizationId,
        String organizationName,
        /** The organization's CURRENT verification status — why a published listing may be hidden. */
        String organizationVerificationStatus,
        String title,
        String status,
        String mode,
        String workMode,
        String location,
        int numberOfOpenings,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate applicationDeadline,
        Instant createdAt,
        Instant publishedAt,

        /**
         * Whether this opportunity is visible RIGHT NOW on the public site.
         *
         * <p>The single most useful column on this screen, and the reason the two verification fields
         * above it are here. {@code status == PUBLISHED} does not mean publicly visible: Backend
         * Phase B1.5 hides a published opportunity whose organization has since been suspended,
         * without changing the opportunity's own state. An operator asked "why can nobody see this
         * listing?" can answer it from this row instead of guessing.
         */
        boolean publiclyDiscoverable) {

    public static AdminOpportunitySummaryResponse from(
            InternshipOpportunity opportunity, Organization organization) {
        return new AdminOpportunitySummaryResponse(
                opportunity.getId(),
                opportunity.getOrganizationId(),
                organization.getName(),
                organization.getVerificationStatus().name(),
                opportunity.getTitle(),
                opportunity.getStatus().name(),
                opportunity.getMode().name(),
                opportunity.getWorkMode().name(),
                opportunity.getLocation(),
                opportunity.getNumberOfOpenings(),
                opportunity.getStartDate(),
                opportunity.getEndDate(),
                opportunity.getApplicationDeadline(),
                opportunity.getCreatedAt(),
                opportunity.getPublishedAt(),
                publiclyDiscoverable(opportunity, organization));
    }

    /**
     * Evaluated from {@link PublicOpportunityVisibility}'s own constants rather than restated, so
     * this flag cannot drift from the SQL predicate that actually governs the public list. The
     * organization is already loaded for the row's name — this costs no extra query.
     */
    static boolean publiclyDiscoverable(InternshipOpportunity opportunity, Organization organization) {
        return opportunity.getStatus() == PublicOpportunityVisibility.STATUS
                && PublicOpportunityVisibility.MODES.contains(opportunity.getMode())
                && organization.getVerificationStatus() == PublicOpportunityVisibility.REQUIRED_ORGANIZATION_STATUS;
    }
}
