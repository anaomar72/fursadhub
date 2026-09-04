package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
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

    /**
     * How many publicly discoverable opportunities each of the given organizations currently has —
     * ONE grouped query for a whole directory page, never one query per card (Backend Phase B1).
     *
     * <p>The status and modes are bound from {@link com.fursadhub.opportunity.domain.PublicOpportunityVisibility}
     * so this counts exactly what {@code GET /api/v1/public/opportunities} returns. It is the same
     * rule, not a copy of it.
     *
     * <p>Organizations with no matching rows are simply absent from the result — {@code GROUP BY}
     * emits no row for an empty group. The caller defaults them to zero.
     */
    @Query("""
            SELECT o.organizationId, COUNT(o)
            FROM InternshipOpportunity o
            WHERE o.organizationId IN :organizationIds
              AND o.status = :status
              AND o.mode IN :modes
            GROUP BY o.organizationId
            """)
    List<Object[]> countPublicByOrganizationIds(
            @Param("organizationIds") Collection<UUID> organizationIds,
            @Param("status") OpportunityStatus status,
            @Param("modes") Collection<OpportunityMode> modes);
}
