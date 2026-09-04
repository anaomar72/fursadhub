package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityStatus;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
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
     *
     * <p>Backend Phase B1.5 added the organization-verification term. This queue is the targeted
     * equivalent of public discovery — it is where a university picks an opportunity to nominate
     * into — so a non-{@code VERIFIED} organization must disappear from it for the same reason it
     * disappears from the public list. Leaving it listed while
     * {@code NominationService.nominate} rejects the write would be exactly the cross-surface
     * mismatch this phase exists to remove.
     */
    @Query("""
            SELECT o FROM InternshipOpportunity o
            WHERE o.status = com.fursadhub.opportunity.domain.OpportunityStatus.PUBLISHED
              AND EXISTS (
                SELECT 1 FROM OpportunityTarget t
                WHERE t.opportunityId = o.id AND t.universityId = :universityId
              )
              AND EXISTS (
                SELECT 1 FROM Organization org
                WHERE org.id = o.organizationId AND org.verificationStatus = :requiredOrganizationStatus
              )
            ORDER BY o.publishedAt DESC
            """)
    List<InternshipOpportunity> findPublishedTargetingUniversity(
            @Param("universityId") UUID universityId,
            @Param("requiredOrganizationStatus") InstitutionVerificationStatus requiredOrganizationStatus);

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
     *
     * <p>Backend Phase B1.5 added the organization-verification term. The directory only ever passes
     * {@code VERIFIED} ids today, so this is belt-and-braces — but it means the count carries the
     * invariant itself rather than relying on every future caller to have filtered first. A count
     * that could disagree with the list it sits beside is precisely the drift this phase removes.
     */
    @Query("""
            SELECT o.organizationId, COUNT(o)
            FROM InternshipOpportunity o
            WHERE o.organizationId IN :organizationIds
              AND o.status = :status
              AND o.mode IN :modes
              AND EXISTS (
                SELECT 1 FROM Organization org
                WHERE org.id = o.organizationId AND org.verificationStatus = :requiredOrganizationStatus
              )
            GROUP BY o.organizationId
            """)
    List<Object[]> countPublicByOrganizationIds(
            @Param("organizationIds") Collection<UUID> organizationIds,
            @Param("status") OpportunityStatus status,
            @Param("modes") Collection<OpportunityMode> modes,
            @Param("requiredOrganizationStatus") InstitutionVerificationStatus requiredOrganizationStatus);
}
