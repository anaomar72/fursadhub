package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.UUID;

/**
 * Dedicated authorization component for university-scoped resources (CLAUDE.md section 24). Every
 * check re-reads current PostgreSQL membership data rather than trusting JWT claims (section 15) —
 * a role string alone never implies access; membership at the specific university (and, for
 * coordinators/supervisors, the specific department) must be verified for every request.
 */
@Component
public class UniversityAuthorization {

    private final UniversityMembershipRepository memberships;
    private final UniversityMembershipDepartmentRepository membershipDepartments;

    public UniversityAuthorization(
            UniversityMembershipRepository memberships, UniversityMembershipDepartmentRepository membershipDepartments) {
        this.memberships = memberships;
        this.membershipDepartments = membershipDepartments;
    }

    /** Requires an active membership at {@code universityId}, optionally restricted to specific roles. */
    public UniversityMembership requireMembership(UUID userId, UUID universityId, UniversityRole... allowedRoles) {
        UniversityMembership membership = memberships.findActiveByUniversityIdAndUserId(universityId, userId)
                .orElseThrow(this::accessDenied);

        if (allowedRoles.length > 0 && Arrays.stream(allowedRoles).noneMatch(role -> role == membership.getRole())) {
            throw accessDenied();
        }
        return membership;
    }

    /**
     * Requires that {@code membership} may act on {@code departmentId}. {@code UNIVERSITY_ADMIN}
     * holds whole-university scope by role; coordinators/supervisors are restricted to their
     * explicitly assigned departments (CLAUDE.md section 25 — department isolation).
     */
    public void requireDepartmentScope(UniversityMembership membership, UUID departmentId) {
        if (membership.getRole() == UniversityRole.UNIVERSITY_ADMIN) {
            return;
        }
        boolean inScope = membershipDepartments.existsActiveForMembershipAndDepartment(membership.getId(), departmentId);
        if (!inScope) {
            throw accessDenied();
        }
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
