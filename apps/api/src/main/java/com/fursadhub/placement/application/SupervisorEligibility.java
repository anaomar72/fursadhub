package com.fursadhub.placement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Validates that a proposed supervisor may actually supervise a given placement (CLAUDE.md
 * Phase 5 section 13).
 *
 * <p>The supervisor id arrives from the browser, so none of it is trusted: the user must exist, hold
 * a CURRENTLY ACTIVE membership (a revoked one does not count), carry the supervisor role for that
 * side, and belong to the placement's OWN university/organization. That last check is what stops
 * staff at University B or Organization B being attached to this placement by id.
 */
@Component
public class SupervisorEligibility {

    private final UserRepository users;
    private final UniversityMembershipRepository universityMemberships;
    private final OrganizationMembershipRepository organizationMemberships;

    public SupervisorEligibility(
            UserRepository users, UniversityMembershipRepository universityMemberships,
            OrganizationMembershipRepository organizationMemberships) {
        this.users = users;
        this.universityMemberships = universityMemberships;
        this.organizationMemberships = organizationMemberships;
    }

    /**
     * The candidate must hold an active {@code UNIVERSITY_SUPERVISOR} membership at the placement's
     * own university. An admin or coordinator is deliberately NOT eligible: supervising a placement
     * is a distinct responsibility from administering a university or coordinating a department, and
     * FursadHub records who actually supervised the student.
     */
    public void requireEligibleUniversitySupervisor(Placement placement, UUID supervisorUserId) {
        requireUserExists(supervisorUserId);

        Optional<UniversityMembership> atPlacementUniversity = universityMemberships
                .findActiveByUniversityIdAndUserId(placement.getUniversityId(), supervisorUserId);

        if (atPlacementUniversity.isEmpty()) {
            // Distinguish "belongs to a different university" from "not eligible at all", so the UI
            // can explain the real problem. Both are refusals; neither reveals anything the caller
            // could not already see about their own university.
            boolean memberElsewhere = universityMemberships.findActiveByUserId(supervisorUserId).isPresent();
            throw memberElsewhere
                    ? new ApiException("SUPERVISOR_WRONG_UNIVERSITY", HttpStatus.UNPROCESSABLE_ENTITY,
                            "That supervisor belongs to a different university.")
                    : notEligible("That user does not hold an active supervisor membership at this university.");
        }

        if (atPlacementUniversity.get().getRole() != UniversityRole.UNIVERSITY_SUPERVISOR) {
            throw notEligible("That user is not a university supervisor.");
        }
    }

    /**
     * The candidate must hold an active {@code ORGANIZATION_SUPERVISOR} membership at the
     * placement's own organization — not an admin or recruiter membership, and not a membership at
     * some other organization.
     */
    public void requireEligibleOrganizationSupervisor(Placement placement, UUID supervisorUserId) {
        requireUserExists(supervisorUserId);

        Optional<OrganizationMembership> atPlacementOrganization = organizationMemberships
                .findActiveByOrganizationIdAndUserId(placement.getOrganizationId(), supervisorUserId);

        if (atPlacementOrganization.isEmpty()) {
            boolean memberElsewhere = !organizationMemberships.findActiveByUserId(supervisorUserId).isEmpty();
            throw memberElsewhere
                    ? new ApiException("SUPERVISOR_WRONG_ORGANIZATION", HttpStatus.UNPROCESSABLE_ENTITY,
                            "That supervisor belongs to a different organization.")
                    : notEligible("That user does not hold an active supervisor membership at this organization.");
        }

        if (atPlacementOrganization.get().getRole() != OrganizationRole.ORGANIZATION_SUPERVISOR) {
            throw notEligible("That user is not an organization supervisor.");
        }
    }

    private void requireUserExists(UUID supervisorUserId) {
        if (users.findById(supervisorUserId).isEmpty()) {
            throw notEligible("That user does not exist.");
        }
    }

    private ApiException notEligible(String message) {
        return new ApiException("SUPERVISOR_NOT_ELIGIBLE", HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
