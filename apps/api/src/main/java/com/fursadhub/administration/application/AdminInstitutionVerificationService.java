package com.fursadhub.administration.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.NotificationType;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * Platform review of institution verification (CLAUDE.md section 31, Phase 7 "Admin: institution
 * verification").
 *
 * <p>This service adds NO state machine of its own. Phase 3 already implemented the frozen
 * DRAFT/SUBMITTED/UNDER_REVIEW/NEEDS_CHANGES/VERIFIED/REJECTED/SUSPENDED/REVOKED transitions as
 * domain methods on {@link Organization} and left them unreachable, because the reviewer role they
 * require did not exist yet. All this does is authorize a platform reviewer, call the existing
 * domain method, audit it and notify the organization's own admins — which is why an invalid
 * transition still fails inside the domain object rather than here.
 *
 * <p>Universities are deliberately NOT reviewable through this service. The pilot's universities are
 * seeded by Flyway as a fixed tenant and their entity is read-only from Java (see the Javadoc on
 * {@code University}); giving the admin console a write path to them would mean redesigning a Phase 2
 * decision, which is out of Phase 7 scope. The admin dashboard reports how many exist, and changing
 * one is an operational task performed through a migration — which is what "seeded fixed tenant"
 * means in practice.
 */
@Service
public class AdminInstitutionVerificationService {

    private final PlatformAuthorization authorization;
    private final OrganizationRepository organizations;
    private final OrganizationMembershipRepository memberships;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;

    public AdminInstitutionVerificationService(
            PlatformAuthorization authorization,
            OrganizationRepository organizations,
            OrganizationMembershipRepository memberships,
            UserRepository users,
            NotificationService notifications,
            AuditService audit) {
        this.authorization = authorization;
        this.organizations = organizations;
        this.memberships = memberships;
        this.users = users;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<Organization> list(
            UUID actingUserId, InstitutionVerificationStatus status, String nameFragment, Pageable pageable) {
        authorization.requireReviewer(actingUserId);
        return organizations.search(status, nameFragment, pageable);
    }

    @Transactional(readOnly = true)
    public Organization get(UUID actingUserId, UUID organizationId) {
        authorization.requireReviewer(actingUserId);
        return requireOrganization(organizationId);
    }

    @Transactional
    public Organization beginReview(UUID actingUserId, UUID organizationId, String ip, String userAgent) {
        return transition(actingUserId, organizationId, Organization::markUnderReview,
                "ORGANIZATION_VERIFICATION_UNDER_REVIEW", null, null, ip, userAgent);
    }

    @Transactional
    public Organization requestChanges(UUID actingUserId, UUID organizationId, String note, String ip, String userAgent) {
        return transition(actingUserId, organizationId, Organization::requestChanges,
                "ORGANIZATION_VERIFICATION_CHANGES_REQUESTED",
                NotificationType.ORGANIZATION_VERIFICATION_CHANGES_REQUESTED, note, ip, userAgent);
    }

    @Transactional
    public Organization verify(UUID actingUserId, UUID organizationId, String ip, String userAgent) {
        return transition(actingUserId, organizationId, Organization::verify,
                "ORGANIZATION_VERIFIED", NotificationType.ORGANIZATION_VERIFIED, null, ip, userAgent);
    }

    @Transactional
    public Organization reject(UUID actingUserId, UUID organizationId, String note, String ip, String userAgent) {
        return transition(actingUserId, organizationId, Organization::reject,
                "ORGANIZATION_VERIFICATION_REJECTED", NotificationType.ORGANIZATION_VERIFICATION_REJECTED,
                note, ip, userAgent);
    }

    @Transactional
    public Organization suspend(UUID actingUserId, UUID organizationId, String note, String ip, String userAgent) {
        return transition(actingUserId, organizationId, Organization::suspend,
                "ORGANIZATION_VERIFICATION_SUSPENDED", NotificationType.ORGANIZATION_VERIFICATION_SUSPENDED,
                note, ip, userAgent);
    }

    @Transactional
    public Organization revoke(UUID actingUserId, UUID organizationId, String note, String ip, String userAgent) {
        return transition(actingUserId, organizationId, Organization::revoke,
                "ORGANIZATION_VERIFICATION_REVOKED", NotificationType.ORGANIZATION_VERIFICATION_REVOKED,
                note, ip, userAgent);
    }

    // ---------------------------------------------------------------- internals

    private Organization transition(
            UUID actingUserId,
            UUID organizationId,
            Consumer<Organization> command,
            String auditEvent,
            NotificationType notificationType,
            String note,
            String ip,
            String userAgent) {
        authorization.requireReviewer(actingUserId);

        Organization organization = requireOrganization(organizationId);
        // The domain object owns the state machine and rejects anything invalid. This service never
        // second-guesses it and never assigns a status field directly.
        command.accept(organization);
        organizations.save(organization);

        audit.record(auditEvent, actingUserId, ip, userAgent,
                "organization " + organizationId + (isBlank(note) ? "" : " - " + note));
        if (notificationType != null) {
            notifyOrganizationAdmins(organization, notificationType);
        }
        return organization;
    }

    /**
     * Tells the organization's own admins, resolved at send time from current memberships rather than
     * from an id stored at submission, so a staffing change in the meantime does not send the outcome
     * to someone who has since left.
     */
    private void notifyOrganizationAdmins(Organization organization, NotificationType type) {
        Map<String, Object> payload = Map.of("organizationName", organization.getName());
        memberships.findByOrganizationId(organization.getId()).stream()
                .filter(OrganizationMembership::isActive)
                .filter(membership -> membership.getRole() == OrganizationRole.ORGANIZATION_ADMIN)
                .forEach(membership -> notifications.notify(
                        membership.getUserId(),
                        type,
                        payload,
                        "/organization/profile",
                        users.findById(membership.getUserId()).map(User::getEmail).orElse(null)));
    }

    private Organization requireOrganization(UUID organizationId) {
        return organizations.findById(organizationId)
                .orElseThrow(() -> new ApiException(
                        "ORGANIZATION_NOT_FOUND", HttpStatus.NOT_FOUND, "No such organization."));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
