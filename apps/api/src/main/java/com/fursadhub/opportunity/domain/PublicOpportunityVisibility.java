package com.fursadhub.opportunity.domain;

import com.fursadhub.verification.domain.InstitutionVerificationStatus;

import java.util.Set;

/**
 * The single canonical definition of "this opportunity is publicly discoverable and open to new
 * candidates".
 *
 * <p>Extracted in Backend Phase B1 because a second call site needed the same rule (the public
 * organization directory's {@code openOpportunityCount}). Backend Phase B1.5 added the third term —
 * live organization verification — for the same reason: the rule now has three surfaces that must
 * not drift, so it has exactly one definition and every surface binds from it.
 *
 * <p><strong>The rule.</strong> An opportunity is publicly discoverable when ALL of:
 * <ol>
 *   <li>its status is {@link #STATUS} ({@code PUBLISHED});</li>
 *   <li>its mode is one of {@link #MODES} ({@code PUBLIC} or {@code HYBRID}) — a
 *       {@code UNIVERSITY_TARGETED}-only opportunity sources candidates exclusively through
 *       nominations and must never appear publicly;</li>
 *   <li>the owning organization's CURRENT verification status is
 *       {@link #REQUIRED_ORGANIZATION_STATUS} ({@code VERIFIED}).</li>
 * </ol>
 *
 * <p><strong>Why the third term is evaluated live rather than persisted.</strong> Publishing already
 * requires a verified organization, but that check happened once. An organization verified at
 * publish time and later {@code SUSPENDED} or {@code REVOKED} kept its opportunities publicly
 * listed and still accepting applications — the trust gap B1.5 closes.
 *
 * <p>Evaluating it live rather than mass-transitioning opportunity rows is deliberate
 * (CLAUDE.md sections 33, 51):
 * <ul>
 *   <li>The opportunity's own state machine is untouched. A {@code PUBLISHED} opportunity stays
 *       {@code PUBLISHED} in persistence for audit and history; it simply stops being effectively
 *       available. FursadHub enforces eligibility, it does not rewrite history.</li>
 *   <li>Re-verification needs no repair pass. Because the organization's status is read at query
 *       time, an organization restored to {@code VERIFIED} immediately makes its still-valid
 *       {@code PUBLISHED} opportunities discoverable again, with no opportunity row rewritten and
 *       no re-publish required.</li>
 * </ul>
 *
 * <p><strong>Where it is applied.</strong> Three queries, all binding from here:
 * <ul>
 *   <li>{@code InternshipOpportunitySpecifications.publiclyVisible()} — the discovery list and the
 *       single-opportunity lookup (and therefore the public screening-question route, which resolves
 *       through that lookup first);</li>
 *   <li>{@code JpaInternshipOpportunityRepository.countPublicByOrganizationIds} — the directory's
 *       {@code openOpportunityCount};</li>
 *   <li>{@code JpaInternshipOpportunityRepository.findPublishedTargetingUniversity} — the
 *       university's nomination queue, which is the targeted equivalent of public discovery.</li>
 * </ul>
 *
 * <p>The matching WRITE-side prerequisite lives in
 * {@code OrganizationVerificationGuard}, which gates publish, resume, self-application and both
 * halves of the nomination flow. Read and write are separate mechanisms because they operate on
 * different things — a SQL predicate over many rows versus a precondition on one action — but they
 * assert the same invariant.
 */
public final class PublicOpportunityVisibility {

    /** The only status an opportunity may hold to be publicly discoverable. */
    public static final OpportunityStatus STATUS = OpportunityStatus.PUBLISHED;

    /** The only sourcing modes that accept public discovery. */
    public static final Set<OpportunityMode> MODES = Set.of(OpportunityMode.PUBLIC, OpportunityMode.HYBRID);

    /**
     * The owning organization's required CURRENT verification status. Read at query time, never
     * cached onto the opportunity — that is what makes suspension take effect immediately and
     * re-verification restore visibility without a data migration.
     */
    public static final InstitutionVerificationStatus REQUIRED_ORGANIZATION_STATUS =
            InstitutionVerificationStatus.VERIFIED;

    private PublicOpportunityVisibility() {
    }
}
