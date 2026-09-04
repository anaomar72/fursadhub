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
