package com.fursadhub.opportunity.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface InternshipOpportunityRepository {

    InternshipOpportunity save(InternshipOpportunity opportunity);

    Optional<InternshipOpportunity> findById(UUID id);

    List<InternshipOpportunity> findByOrganizationId(UUID organizationId);

    /** Only {@code PUBLISHED} opportunities in mode {@code PUBLIC}/{@code HYBRID} are ever eligible (CLAUDE.md section 11). */
    Page<InternshipOpportunity> searchPublic(PublicOpportunityFilter filter, Pageable pageable);

    Optional<InternshipOpportunity> findPublicById(UUID id);

    /**
     * Platform-administration search across EVERY opportunity, in any state (Backend Phase B6).
     *
     * <p>Deliberately unconstrained by {@link PublicOpportunityVisibility}: this is oversight, not
     * discovery. Authorization is the caller's job and is {@code requireSuperAdmin} — see
     * {@code AdminOpportunityQueryService}, the only caller.
     */
    Page<InternshipOpportunity> searchForAdmin(AdminOpportunityFilter filter, Pageable pageable);

    /**
     * How many opportunities are currently PUBLICLY DISCOVERABLE across the whole platform
     * (Backend Phase B6), bound to {@link PublicOpportunityVisibility} so it counts exactly what
     * {@code GET /api/v1/public/opportunities} returns.
     *
     * <p>Not the same number as "status = PUBLISHED": a published opportunity whose organization has
     * been suspended is excluded here and included there. Both are real, and the platform statistics
     * report them under names that say which is which.
     */
    long countPubliclyDiscoverable();

    /**
     * Opportunities currently PUBLISHED that target the given university, for that university's
     * nomination work queue. The PUBLISHED restriction lives in the query itself so a draft or
     * cancelled opportunity can never surface in a university's queue.
     */
    List<InternshipOpportunity> findPublishedTargetingUniversity(UUID universityId);

    /**
     * Publicly discoverable opportunity counts for a whole set of organizations, in ONE query
     * (Backend Phase B1) — the public organization directory's {@code openOpportunityCount}.
     *
     * <p>Counts exactly what {@link #searchPublic} returns, because both bind the same
     * {@link PublicOpportunityVisibility} rule.
     *
     * @return counts keyed by organization id. An organization with none is ABSENT from the map
     *         rather than present with zero — callers default it themselves.
     */
    Map<UUID, Long> countPublicByOrganizationIds(Collection<UUID> organizationIds);
}
