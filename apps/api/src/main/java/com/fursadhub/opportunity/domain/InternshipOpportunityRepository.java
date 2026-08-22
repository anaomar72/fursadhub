package com.fursadhub.opportunity.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternshipOpportunityRepository {

    InternshipOpportunity save(InternshipOpportunity opportunity);

    Optional<InternshipOpportunity> findById(UUID id);

    List<InternshipOpportunity> findByOrganizationId(UUID organizationId);

    /** Only {@code PUBLISHED} opportunities in mode {@code PUBLIC}/{@code HYBRID} are ever eligible (CLAUDE.md section 11). */
    Page<InternshipOpportunity> searchPublic(PublicOpportunityFilter filter, Pageable pageable);

    Optional<InternshipOpportunity> findPublicById(UUID id);
}
