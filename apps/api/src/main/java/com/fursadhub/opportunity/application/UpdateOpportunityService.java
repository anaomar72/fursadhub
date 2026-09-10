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
    private final OpportunityTagService tags;
    private final AuditService audit;

    public UpdateOpportunityService(
            InternshipOpportunityRepository opportunities, OpportunityQueryService queryService,
            OrganizationAuthorization organizationAuthorization, OpportunityTagService tags, AuditService audit) {
        this.opportunities = opportunities;
        this.queryService = queryService;
        this.organizationAuthorization = organizationAuthorization;
        this.tags = tags;
        this.audit = audit;
    }

    /**
     * <strong>Two update semantics, resolved here.</strong> The eleven pre-B3 fields keep FULL
     * REPLACEMENT — omitting an optional one clears it — because callers written against that
     * contract may rely on it. The four fields Backend Phase B3 added are presence-aware: omitting
     * one PRESERVES what is stored, and only an explicit null (or an empty array, for a list) clears
     * it.
     *
     * <p>Without that split, the existing frontend — which sends exactly the original eleven fields
     * and knows nothing about compensation, skills, perks or hours — would erase all four on every
     * save. That is the Backend Phase B2 data-loss bug, and this endpoint had the identical shape.
     *
     * <p>Authorization and the DRAFT-only editing rule are unchanged: membership is checked before
     * any field is read, and the entity itself refuses edits outside {@code DRAFT}.
     */
    @Transactional
    public InternshipOpportunity update(
            UUID actingUserId, UUID opportunityId, String title, String description, String responsibilities,
            String requirements, OpportunityMode mode, int numberOfOpenings, WorkMode workMode, String location,
            LocalDate startDate, LocalDate endDate, LocalDate applicationDeadline,
            OpportunityEnrichment enrichment, String ipAddress, String userAgent) {
        InternshipOpportunity opportunity = queryService.getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(
                actingUserId, opportunity.getOrganizationId(), OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.RECRUITER);
        OpportunityFieldValidation.validate(mode, numberOfOpenings, startDate, endDate, applicationDeadline);

        opportunity.applyEdits(title, description, responsibilities, requirements, mode, numberOfOpenings, workMode,
                location, startDate, endDate, applicationDeadline);
        opportunity.applyEnrichment(
                enrichment.compensation().resolve(opportunity.getCompensation()),
                enrichment.hoursPerWeek().resolve(opportunity.getHoursPerWeek()));
        opportunities.save(opportunity);

        // Value lists are rewritten only when the client actually sent them. An omitted list leaves
        // its rows completely untouched — no delete, no re-insert, no position churn.
        if (enrichment.skills().isPresent()) {
            tags.replaceSkills(opportunityId, enrichment.skills().value());
        }
        if (enrichment.perks().isPresent()) {
            tags.replacePerks(opportunityId, enrichment.perks().value());
        }

        audit.record("OPPORTUNITY_UPDATED", actingUserId, ipAddress, userAgent, "opportunityId=" + opportunityId);

        return opportunity;
    }
}
