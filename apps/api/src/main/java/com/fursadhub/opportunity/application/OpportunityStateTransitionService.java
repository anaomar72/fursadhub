package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityTargetRepository;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.function.Consumer;

/**
 * Explicit opportunity lifecycle commands (CLAUDE.md section 7/33) — never arbitrary status
 * mutation. Publishing additionally requires the owning organization to be {@code VERIFIED}
 * (CLAUDE.md section 6) and, for {@code UNIVERSITY_TARGETED} opportunities, at least one target
 * university (otherwise there is nobody to nominate from).
 */
@Service
public class OpportunityStateTransitionService {

    private final InternshipOpportunityRepository opportunities;
    private final OpportunityTargetRepository targets;
    private final OpportunityQueryService queryService;
    private final OrganizationQueryService organizationQueryService;
    private final OrganizationAuthorization organizationAuthorization;
    private final AuditService audit;

    public OpportunityStateTransitionService(
            InternshipOpportunityRepository opportunities, OpportunityTargetRepository targets,
            OpportunityQueryService queryService, OrganizationQueryService organizationQueryService,
            OrganizationAuthorization organizationAuthorization, AuditService audit) {
        this.opportunities = opportunities;
        this.targets = targets;
        this.queryService = queryService;
        this.organizationQueryService = organizationQueryService;
        this.organizationAuthorization = organizationAuthorization;
        this.audit = audit;
    }

    @Transactional
    public InternshipOpportunity publish(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        InternshipOpportunity opportunity = authorizeWrite(actingUserId, opportunityId);

        Organization organization = organizationQueryService.getOrThrow(opportunity.getOrganizationId());
        if (!organization.isVerified()) {
            throw new ApiException("ORGANIZATION_NOT_VERIFIED", HttpStatus.CONFLICT,
                    "Your organization must be verified before publishing opportunities.");
        }
        if (opportunity.getMode() == OpportunityMode.UNIVERSITY_TARGETED && targets.findByOpportunityId(opportunityId).isEmpty()) {
            throw new ApiException("OPPORTUNITY_TARGET_REQUIRED", HttpStatus.CONFLICT,
                    "At least one target university is required before publishing a university-targeted opportunity.");
        }

        return transition(opportunity, InternshipOpportunity::publish, "OPPORTUNITY_PUBLISHED", actingUserId, ipAddress, userAgent);
    }

    @Transactional
    public InternshipOpportunity pause(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        return transition(authorizeWrite(actingUserId, opportunityId), InternshipOpportunity::pause,
                "OPPORTUNITY_PAUSED", actingUserId, ipAddress, userAgent);
    }

    @Transactional
    public InternshipOpportunity resume(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        return transition(authorizeWrite(actingUserId, opportunityId), InternshipOpportunity::resume,
                "OPPORTUNITY_RESUMED", actingUserId, ipAddress, userAgent);
    }

    @Transactional
    public InternshipOpportunity close(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        return transition(authorizeWrite(actingUserId, opportunityId), InternshipOpportunity::close,
                "OPPORTUNITY_CLOSED", actingUserId, ipAddress, userAgent);
    }

    @Transactional
    public InternshipOpportunity cancel(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        return transition(authorizeWrite(actingUserId, opportunityId), InternshipOpportunity::cancel,
                "OPPORTUNITY_CANCELLED", actingUserId, ipAddress, userAgent);
    }

    private InternshipOpportunity authorizeWrite(UUID actingUserId, UUID opportunityId) {
        InternshipOpportunity opportunity = queryService.getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(
                actingUserId, opportunity.getOrganizationId(), OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.RECRUITER);
        return opportunity;
    }

    private InternshipOpportunity transition(
            InternshipOpportunity opportunity, Consumer<InternshipOpportunity> action, String auditEvent,
            UUID actingUserId, String ipAddress, String userAgent) {
        action.accept(opportunity);
        opportunities.save(opportunity);
        audit.record(auditEvent, actingUserId, ipAddress, userAgent, "opportunityId=" + opportunity.getId());
        return opportunity;
    }
}
