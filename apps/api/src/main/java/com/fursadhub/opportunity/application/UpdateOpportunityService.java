package com.fursadhub.opportunity.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.WorkMode;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/** Editing is restricted to {@code DRAFT} opportunities (enforced in the domain entity itself). */
@Service
public class UpdateOpportunityService {

    private final InternshipOpportunityRepository opportunities;
    private final OpportunityQueryService queryService;
    private final OrganizationAuthorization organizationAuthorization;
    private final AuditService audit;

    public UpdateOpportunityService(
            InternshipOpportunityRepository opportunities, OpportunityQueryService queryService,
            OrganizationAuthorization organizationAuthorization, AuditService audit) {
        this.opportunities = opportunities;
        this.queryService = queryService;
        this.organizationAuthorization = organizationAuthorization;
        this.audit = audit;
    }

    @Transactional
    public InternshipOpportunity update(
            UUID actingUserId, UUID opportunityId, String title, String description, String responsibilities,
            String requirements, OpportunityMode mode, int numberOfOpenings, WorkMode workMode, String location,
            LocalDate startDate, LocalDate endDate, LocalDate applicationDeadline, String ipAddress, String userAgent) {
        InternshipOpportunity opportunity = queryService.getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(
                actingUserId, opportunity.getOrganizationId(), OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.RECRUITER);
        OpportunityFieldValidation.validate(mode, numberOfOpenings, startDate, endDate, applicationDeadline);

        opportunity.applyEdits(title, description, responsibilities, requirements, mode, numberOfOpenings, workMode,
                location, startDate, endDate, applicationDeadline);
        opportunities.save(opportunity);

        audit.record("OPPORTUNITY_UPDATED", actingUserId, ipAddress, userAgent, "opportunityId=" + opportunityId);

        return opportunity;
    }
}
