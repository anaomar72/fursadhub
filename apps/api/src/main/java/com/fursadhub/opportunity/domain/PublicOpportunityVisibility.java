package com.fursadhub.opportunity.domain;

import java.util.Set;

/**
 * The single canonical definition of "this opportunity is publicly discoverable".
 *
 * <p>Extracted in Backend Phase B1 because a second call site now needs the same rule: the public
 * organization directory reports an {@code openOpportunityCount} per organization, and that count
 * must mean exactly what {@code GET /api/v1/public/opportunities} means — not a second, subtly
 * different definition that drifts the first time either is edited.
 *
 * <p>Both call sites bind from here:
 * <ul>
 *   <li>{@code InternshipOpportunitySpecifications.publiclyVisible()} — the discovery query</li>
 *   <li>{@code JpaInternshipOpportunityRepository.countPublicByOrganizationIds} — the directory count</li>
 * </ul>
 *
 * <p>The rule itself is UNCHANGED from what Phase 3 shipped: {@code PUBLISHED} status, in mode
 * {@code PUBLIC} or {@code HYBRID}. A {@code UNIVERSITY_TARGETED}-only opportunity sources
 * candidates exclusively through nominations and must never appear publicly; a {@code DRAFT},
 * {@code PAUSED}, {@code CLOSED} or {@code CANCELLED} opportunity is not open to anyone.
 *
 * <p><strong>Known inconsistency, deliberately not addressed here (see the B1 report):</strong> this
 * predicate does not consider the owning organization's verification status. An organization that
 * publishes while {@code VERIFIED} and is later {@code SUSPENDED}/{@code REVOKED} keeps its
 * opportunities publicly listed. Changing that is a public-visibility semantics change and was
 * explicitly held out of B1's scope.
 */
public final class PublicOpportunityVisibility {

    /** The only status an opportunity may hold to be publicly discoverable. */
    public static final OpportunityStatus STATUS = OpportunityStatus.PUBLISHED;

    /** The only sourcing modes that accept public discovery. */
    public static final Set<OpportunityMode> MODES = Set.of(OpportunityMode.PUBLIC, OpportunityMode.HYBRID);

    private PublicOpportunityVisibility() {
    }
}
