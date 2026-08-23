package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.organization.application.OrganizationAuthorization;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Organization-management read access to opportunities (CLAUDE.md section 8/26). */
@Service
@Transactional(readOnly = true)
public class OpportunityQueryService {

    private final InternshipOpportunityRepository opportunities;
    private final OrganizationAuthorization organizationAuthorization;

    public OpportunityQueryService(InternshipOpportunityRepository opportunities, OrganizationAuthorization organizationAuthorization) {
        this.opportunities = opportunities;
        this.organizationAuthorization = organizationAuthorization;
    }

    public List<InternshipOpportunity> listForOrganization(UUID actingUserId, UUID organizationId) {
        organizationAuthorization.requireMembership(actingUserId, organizationId);
        return opportunities.findByOrganizationId(organizationId);
    }

    /**
     * Management detail lookup: the organization scope isn't in the URL (CLAUDE.md section 8:
     * {@code GET /api/v1/opportunities/{opportunityId}}), so authorization is derived from the
     * opportunity's own {@code organizationId} rather than trusted from any caller-supplied value.
     */
    public InternshipOpportunity getForMember(UUID actingUserId, UUID opportunityId) {
        InternshipOpportunity opportunity = getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(actingUserId, opportunity.getOrganizationId());
        return opportunity;
    }

    public InternshipOpportunity getOrThrow(UUID opportunityId) {
        return opportunities.findById(opportunityId).orElseThrow(this::opportunityNotFound);
    }

    /**
     * Published opportunities targeting one university, for that university's Phase 4 nomination
     * queue. Authorization for the calling staff member is enforced by the caller
     * ({@code NominationQueryService}), which owns the university-membership context.
     */
    public List<InternshipOpportunity> listPublishedTargetingUniversity(UUID universityId) {
        return opportunities.findPublishedTargetingUniversity(universityId);
    }

    private ApiException opportunityNotFound() {
        return new ApiException("OPPORTUNITY_NOT_FOUND", HttpStatus.NOT_FOUND, "Opportunity not found.");
    }
}
