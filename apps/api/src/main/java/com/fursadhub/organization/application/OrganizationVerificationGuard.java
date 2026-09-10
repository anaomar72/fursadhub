package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.PublicOpportunityVisibility;
import com.fursadhub.organization.domain.Organization;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The write-side half of the organization-verification invariant (Backend Phase B1.5):
 * an organization whose CURRENT verification status is not
 * {@link PublicOpportunityVisibility#REQUIRED_ORGANIZATION_STATUS} must not acquire new candidates
 * through FursadHub.
 *
 * <p>The read-side half is the predicate documented on {@link PublicOpportunityVisibility}. Both
 * assert the same invariant; they are separate mechanisms only because one is a SQL predicate over
 * many rows and the other is a precondition on a single action.
 *
 * <p><strong>Why a shared component.</strong> Five call sites need this — publish, resume,
 * self-application, nomination and nomination consent. Before B1.5 exactly one of them
 * ({@code publish}) had the check inline, which is how the gap arose: a one-shot check on one path
 * looks complete until you ask what happens on every other path. One component means one error
 * contract and one place to change the rule.
 *
 * <p><strong>What this deliberately does NOT do.</strong> It never mutates anything. Losing
 * verification does not transition opportunities, reject candidacies, withdraw offers, terminate
 * placements or touch completed internship history (CLAUDE.md sections 33, 39, 51 — meaningful
 * history is never silently overwritten). It blocks NEW intake and nothing else, so an organization
 * restored to {@code VERIFIED} resumes normal operation with no repair pass.
 */
@Component
@Transactional(readOnly = true)
public class OrganizationVerificationGuard {

    /**
     * Stable code shared by every rejection here. Phase 3 already established it on the publish
     * path, and the frontend branches on the code, never the message (CLAUDE.md section 11), so
     * reusing it keeps the contract additive rather than introducing a second code for the same
     * condition.
     */
    private static final String CODE = "ORGANIZATION_NOT_VERIFIED";

    private final OrganizationQueryService organizations;

    public OrganizationVerificationGuard(OrganizationQueryService organizations) {
        this.organizations = organizations;
    }

    /**
     * For an action the organization's OWN staff performs on their own opportunity — publishing or
     * resuming. The message is addressed to them.
     */
    public void requireVerifiedForOwnAction(UUID organizationId) {
        require(organizationId, "Your organization must be verified before publishing opportunities.");
    }

    /**
     * For NEW candidate intake driven by someone outside the organization — a student applying, a
     * university nominating, a student consenting to a nomination. The message must not read as if
     * the caller owned the organization, and must not disclose which non-verified state it is in.
     */
    public void requireVerifiedForCandidateIntake(UUID organizationId) {
        require(organizationId, "This organization is not currently accepting new candidates.");
    }

    private void require(UUID organizationId, String message) {
        Organization organization = organizations.getOrThrow(organizationId);
        if (organization.getVerificationStatus() != PublicOpportunityVisibility.REQUIRED_ORGANIZATION_STATUS) {
            // 409, not 403: the caller may well be authorized: the RESOURCE is in a state that does
            // not permit the action. This mirrors how the opportunity state machine reports
            // OPPORTUNITY_NOT_PUBLISHED for the same class of condition.
            throw new ApiException(CODE, HttpStatus.CONFLICT, message);
        }
    }
}
