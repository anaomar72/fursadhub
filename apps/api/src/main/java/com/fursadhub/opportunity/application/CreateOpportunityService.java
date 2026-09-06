package com.fursadhub.opportunity.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.opportunity.domain.Compensation;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.WorkMode;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Opportunity creation, restricted to {@code ORGANIZATION_ADMIN}/{@code RECRUITER} members of the
 * owning organization (CLAUDE.md section 3/6) — an {@code ORGANIZATION_SUPERVISOR} must not gain
 * opportunity-management access by default.
 */
@Service
public class CreateOpportunityService {

    private final InternshipOpportunityRepository opportunities;
    private final OrganizationAuthorization organizationAuthorization;
    private final OpportunityTagService tags;
    private final AuditService audit;

    public CreateOpportunityService(
            InternshipOpportunityRepository opportunities, OrganizationAuthorization organizationAuthorization,
            OpportunityTagService tags, AuditService audit) {
        this.opportunities = opportunities;
        this.organizationAuthorization = organizationAuthorization;
        this.tags = tags;
        this.audit = audit;
    }

    /**
     * Backend Phase B3 added the four optional enrichment arguments. Authorization is unchanged:
     * {@code ORGANIZATION_ADMIN}/{@code RECRUITER} of THIS organization, checked before any field is
     * read, and no new role gained the ability to create an opportunity.
     *
     * <p>One transaction covers the opportunity row and both value lists, so a rejected skill list
     * cannot leave a half-created opportunity behind.
     */
    @Transactional
    public InternshipOpportunity create(
            UUID actingUserId, UUID organizationId, String title, String description, String responsibilities,
            String requirements, OpportunityMode mode, int numberOfOpenings, WorkMode workMode, String location,
            LocalDate startDate, LocalDate endDate, LocalDate applicationDeadline,
            Compensation compensation, List<String> skills, List<String> perks, Integer hoursPerWeek,
            String ipAddress, String userAgent) {
        organizationAuthorization.requireMembership(
                actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.RECRUITER);
        OpportunityFieldValidation.validate(mode, numberOfOpenings, startDate, endDate, applicationDeadline);

        InternshipOpportunity opportunity = InternshipOpportunity.draft(
                organizationId, title, description, responsibilities, requirements, mode, numberOfOpenings, workMode,
                location, startDate, endDate, applicationDeadline, actingUserId);
        opportunity.applyEnrichment(compensation, hoursPerWeek);
        opportunities.save(opportunity);
        tags.replaceSkills(opportunity.getId(), skills);
        tags.replacePerks(opportunity.getId(), perks);

        audit.record("OPPORTUNITY_CREATED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";opportunityId=" + opportunity.getId());

        return opportunity;
    }
}
