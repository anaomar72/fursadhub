package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityTargetRepository;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.application.OrganizationVerificationGuard;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.function.Consumer;

/**
 * Explicit opportunity lifecycle commands (CLAUDE.md section 7/33) — never arbitrary status
 * mutation. Publishing and resuming additionally require the owning organization to be currently
 * {@code VERIFIED} (CLAUDE.md section 6), and publishing a {@code UNIVERSITY_TARGETED} opportunity
 * requires at least one target university (otherwise there is nobody to nominate from).
 *
 * <p>Both availability-granting transitions go through {@link OrganizationVerificationGuard}; the
 * withdrawing ones (pause, close, cancel) deliberately do not — see the note on {@link #pause}.
 */
@Service
public class OpportunityStateTransitionService {

    private final InternshipOpportunityRepository opportunities;
    private final OpportunityTargetRepository targets;
    private final OpportunityQueryService queryService;
    private final OrganizationVerificationGuard verificationGuard;
    private final OrganizationAuthorization organizationAuthorization;
    private final AuditService audit;

    public OpportunityStateTransitionService(
            InternshipOpportunityRepository opportunities, OpportunityTargetRepository targets,
            OpportunityQueryService queryService, OrganizationVerificationGuard verificationGuard,
            OrganizationAuthorization organizationAuthorization, AuditService audit) {
        this.opportunities = opportunities;
        this.targets = targets;
        this.queryService = queryService;
        this.verificationGuard = verificationGuard;
        this.organizationAuthorization = organizationAuthorization;
        this.audit = audit;
    }

    @Transactional
    public InternshipOpportunity publish(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        InternshipOpportunity opportunity = authorizeWrite(actingUserId, opportunityId);

        // Behaviour unchanged from Phase 3 — same code, same status, same message. Only the
        // implementation moved, so publish and resume cannot answer this question differently.
        verificationGuard.requireVerifiedForOwnAction(opportunity.getOrganizationId());

        if (opportunity.getMode() == OpportunityMode.UNIVERSITY_TARGETED && targets.findByOpportunityId(opportunityId).isEmpty()) {
            throw new ApiException("OPPORTUNITY_TARGET_REQUIRED", HttpStatus.CONFLICT,
                    "At least one target university is required before publishing a university-targeted opportunity.");
        }

        return transition(opportunity, InternshipOpportunity::publish, "OPPORTUNITY_PUBLISHED", actingUserId, ipAddress, userAgent);
    }

    /**
     * Pausing is deliberately NOT gated. Withdrawing an opportunity from availability is always
     * allowed — refusing it would trap a suspended organization's opportunity in a state it cannot
     * leave, which is the opposite of what this invariant is for.
     */
    @Transactional
    public InternshipOpportunity pause(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        return transition(authorizeWrite(actingUserId, opportunityId), InternshipOpportunity::pause,
                "OPPORTUNITY_PAUSED", actingUserId, ipAddress, userAgent);
    }

    /**
     * Resuming makes an opportunity effectively available again, so it carries the same live
     * verification prerequisite as publishing (Backend Phase B1.5).
     *
     * <p>Before B1.5 this was the sharpest edge of the gap: {@code requireMembership} checks only
     * that the caller holds an active role, never the organization's verification status, so staff
     * of a SUSPENDED organization could pause and resume an opportunity straight back into public
     * discovery — re-publishing without ever calling publish.
     */
    @Transactional
    public InternshipOpportunity resume(UUID actingUserId, UUID opportunityId, String ipAddress, String userAgent) {
        InternshipOpportunity opportunity = authorizeWrite(actingUserId, opportunityId);
        verificationGuard.requireVerifiedForOwnAction(opportunity.getOrganizationId());

        return transition(opportunity, InternshipOpportunity::resume,
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
