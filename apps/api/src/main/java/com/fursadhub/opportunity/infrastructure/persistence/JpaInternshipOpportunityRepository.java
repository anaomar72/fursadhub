package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

interface JpaInternshipOpportunityRepository
        extends JpaRepository<InternshipOpportunity, UUID>, JpaSpecificationExecutor<InternshipOpportunity> {

    List<InternshipOpportunity> findByOrganizationId(UUID organizationId);

    /**
     * Joins through opportunity_targets so a university only ever sees opportunities that actually
     * name it, and only while they are PUBLISHED.
     */
    @Query("""
            SELECT o FROM InternshipOpportunity o
            WHERE o.status = com.fursadhub.opportunity.domain.OpportunityStatus.PUBLISHED
              AND EXISTS (
                SELECT 1 FROM OpportunityTarget t
                WHERE t.opportunityId = o.id AND t.universityId = :universityId
              )
            ORDER BY o.publishedAt DESC
            """)
    List<InternshipOpportunity> findPublishedTargetingUniversity(@Param("universityId") UUID universityId);
}
