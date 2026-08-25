package com.fursadhub.placement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementSupervisorAssignmentRepository;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * The single authorization boundary for placements (CLAUDE.md section 24).
 *
 * <p>Access is never granted from a role string. Every check resolves scope from the PLACEMENT
 * itself — its own {@code organization_id}, {@code university_id} and {@code department_id} — and
 * then re-reads the caller's current membership from PostgreSQL. Nothing here trusts a JWT claim or
 * anything the caller supplied in the request, so changing a UUID in a URL cannot reach another
 * organization's, university's, department's or student's placement.
 *
 * <p>The two supervisor roles are deliberately the narrowest scopes in the system:
 * {@code UNIVERSITY_SUPERVISOR} and {@code ORGANIZATION_SUPERVISOR} reach a placement only through
 * an ACTIVE assignment on that specific placement. Holding the role grants nothing on its own, so a
 * supervisor cannot enumerate their university's or organization's other placements, and a
 * supervisor whose assignment has been closed loses access the moment it is closed.
 */
@Component
public class PlacementAuthorization {

    /**
     * Organization staff who may manage a placement: run its lifecycle and assign its organization
     * supervisor. {@code ORGANIZATION_SUPERVISOR} is excluded on purpose — supervising an
     * internship does not imply the authority to end it or to replace yourself.
     */
    private static final OrganizationRole[] ORGANIZATION_MANAGING_ROLES = {
            OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.RECRUITER
    };

    /**
     * University staff who may assign the university supervisor. {@code UNIVERSITY_SUPERVISOR} is
     * excluded for the same reason as above; a coordinator is additionally confined to their own
     * departments by {@link UniversityAuthorization#requireDepartmentScope}.
     */
    private static final UniversityRole[] UNIVERSITY_MANAGING_ROLES = {
            UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR
    };

    private final PlacementRepository placements;
    private final PlacementSupervisorAssignmentRepository assignments;
    private final UniversityAuthorization universityAuthorization;
    private final OrganizationAuthorization organizationAuthorization;
    private final UniversityMembershipRepository universityMemberships;
    private final OrganizationMembershipRepository organizationMemberships;

    public PlacementAuthorization(
            PlacementRepository placements, PlacementSupervisorAssignmentRepository assignments,
            UniversityAuthorization universityAuthorization, OrganizationAuthorization organizationAuthorization,
            UniversityMembershipRepository universityMemberships,
            OrganizationMembershipRepository organizationMemberships) {
        this.placements = placements;
        this.assignments = assignments;
        this.universityAuthorization = universityAuthorization;
        this.organizationAuthorization = organizationAuthorization;
        this.universityMemberships = universityMemberships;
        this.organizationMemberships = organizationMemberships;
    }

    public Placement getOrThrow(UUID placementId) {
        return placements.findById(placementId).orElseThrow(this::notFound);
    }

    // ---------------------------------------------------------------- student

    /**
     * The owning student. A placement belonging to another student is reported as NOT FOUND rather
     * than FORBIDDEN, so probing UUIDs cannot confirm another student's placement exists — the same
     * rule Phase 4 applies to candidacies and offers (CLAUDE.md section 12).
     */
    public Placement requireOwningStudent(UUID studentUserId, UUID placementId) {
        return placements.findById(placementId)
                .filter(placement -> placement.getStudentUserId().equals(studentUserId))
                .orElseThrow(this::notFound);
    }

    // ---------------------------------------------------------------- read

    /**
     * Read access for whichever party the caller actually is. The caller may be the owning student,
     * university staff in scope, or organization staff in scope; a caller who is none of those is
     * denied even if they hold a staff role somewhere else entirely.
     */
    public Placement requireReadAccess(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);

        boolean permitted = placement.getStudentUserId().equals(actingUserId)
                || hasUniversityReadAccess(actingUserId, placement)
                || hasOrganizationReadAccess(actingUserId, placement);

        if (!permitted) {
            throw accessDenied();
        }
        return placement;
    }

    /**
     * University-side read scope:
     * <ul>
     *   <li>{@code UNIVERSITY_ADMIN} — the whole university, but only THEIR university.</li>
     *   <li>{@code DEPARTMENT_COORDINATOR} — only their assigned departments. Sharing a university
     *       with the placement is not enough (CLAUDE.md section 25 — department isolation).</li>
     *   <li>{@code UNIVERSITY_SUPERVISOR} — only placements they are actively assigned to.</li>
     * </ul>
     */
    public boolean hasUniversityReadAccess(UUID actingUserId, Placement placement) {
        Optional<UniversityMembership> membership =
                universityMemberships.findActiveByUniversityIdAndUserId(placement.getUniversityId(), actingUserId);
        if (membership.isEmpty()) {
            return false;
        }
        return switch (membership.get().getRole()) {
            case UNIVERSITY_ADMIN -> true;
            case DEPARTMENT_COORDINATOR -> hasDepartmentScope(membership.get(), placement);
            case UNIVERSITY_SUPERVISOR -> isActivelyAssigned(actingUserId, placement);
        };
    }

    /**
     * Organization-side read scope: admins and recruiters see their own organization's placements;
     * {@code ORGANIZATION_SUPERVISOR} sees only the placements they are actively assigned to, and
     * never the rest of the organization's pipeline (CLAUDE.md section 26, Phase 5 section 10).
     */
    public boolean hasOrganizationReadAccess(UUID actingUserId, Placement placement) {
        Optional<OrganizationMembership> membership = organizationMemberships
                .findActiveByOrganizationIdAndUserId(placement.getOrganizationId(), actingUserId);
        if (membership.isEmpty()) {
            return false;
        }
        return switch (membership.get().getRole()) {
            case ORGANIZATION_ADMIN, RECRUITER -> true;
            case ORGANIZATION_SUPERVISOR -> isActivelyAssigned(actingUserId, placement);
        };
    }

    // ---------------------------------------------------------------- manage

    /**
     * Organization staff running the placement lifecycle (start/cancel/terminate/request-completion)
     * or assigning the organization supervisor. Membership must be at the PLACEMENT's organization,
     * so Organization A can never act on Organization B's placement.
     */
    public Placement requireOrganizationManage(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);
        organizationAuthorization.requireMembership(
                actingUserId, placement.getOrganizationId(), ORGANIZATION_MANAGING_ROLES);
        return placement;
    }

    /**
     * University staff assigning the university supervisor. Membership must be at the PLACEMENT's
     * university, and a coordinator must additionally hold scope over the placement's OWN
     * department — the historical department stored on the placement, not the student's current one.
     */
    public Placement requireUniversityManage(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);
        UniversityMembership membership = universityAuthorization.requireMembership(
                actingUserId, placement.getUniversityId(), UNIVERSITY_MANAGING_ROLES);
        universityAuthorization.requireDepartmentScope(membership, placement.getDepartmentId());
        return placement;
    }

    /** University-scoped listing: any active staff membership at that university, role-gated later. */
    public UniversityMembership requireUniversityMembership(UUID actingUserId, UUID universityId) {
        return universityAuthorization.requireMembership(actingUserId, universityId);
    }

    /** Organization-scoped listing: any active staff membership at that organization. */
    public OrganizationMembership requireOrganizationMembership(UUID actingUserId, UUID organizationId) {
        return organizationAuthorization.requireMembership(actingUserId, organizationId);
    }

    // ---------------------------------------------------------------- helpers

    private boolean hasDepartmentScope(UniversityMembership membership, Placement placement) {
        try {
            universityAuthorization.requireDepartmentScope(membership, placement.getDepartmentId());
            return true;
        } catch (ApiException e) {
            return false;
        }
    }

    private boolean isActivelyAssigned(UUID userId, Placement placement) {
        return assignments.existsActiveForPlacementAndSupervisor(placement.getId(), userId);
    }

    private ApiException notFound() {
        return new ApiException("PLACEMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "Placement not found.");
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this placement.");
    }
}
