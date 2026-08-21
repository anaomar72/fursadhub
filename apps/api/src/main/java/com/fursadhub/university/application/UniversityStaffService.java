package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipDepartment;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * University-admin-scoped staff management: assigning/listing/revoking
 * {@code DEPARTMENT_COORDINATOR}/{@code UNIVERSITY_SUPERVISOR}/{@code UNIVERSITY_ADMIN}
 * memberships within the caller's own university (CLAUDE.md section 25). Onboarding the very
 * first {@code UNIVERSITY_ADMIN} for a new university is a manual/admin-console concern deferred
 * to Phase 7 — this service only lets an existing admin manage staff for their own university.
 */
@Service
public class UniversityStaffService {

    private final UniversityAuthorization authorization;
    private final UniversityMembershipRepository memberships;
    private final UniversityMembershipDepartmentRepository membershipDepartments;
    private final DepartmentRepository departments;
    private final UserRepository users;
    private final AuditService audit;

    public UniversityStaffService(
            UniversityAuthorization authorization,
            UniversityMembershipRepository memberships,
            UniversityMembershipDepartmentRepository membershipDepartments,
            DepartmentRepository departments,
            UserRepository users,
            AuditService audit) {
        this.authorization = authorization;
        this.memberships = memberships;
        this.membershipDepartments = membershipDepartments;
        this.departments = departments;
        this.users = users;
        this.audit = audit;
    }

    public record StaffMember(UniversityMembership membership, String email, List<UUID> departmentIds) {
    }

    @Transactional
    public StaffMember assign(
            UUID actingUserId, UUID universityId, String rawEmail, UniversityRole role, List<UUID> departmentIds,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        String email = EmailNormalizer.normalize(rawEmail);
        User target = users.findByEmail(email)
                .orElseThrow(() -> new ApiException("STAFF_USER_NOT_FOUND", HttpStatus.NOT_FOUND, "No account exists for this email."));
        if (target.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException("STAFF_USER_NOT_ACTIVE", HttpStatus.CONFLICT, "This account must be active before it can be assigned a staff role.");
        }
        if (memberships.existsActiveByUniversityIdAndUserId(universityId, target.getId())) {
            throw new ApiException("STAFF_ALREADY_ASSIGNED", HttpStatus.CONFLICT, "This user already has an active staff role at this university.");
        }

        UniversityMembership membership = UniversityMembership.assign(universityId, target.getId(), role);
        memberships.save(membership);

        List<UUID> scopedDepartmentIds = List.of();
        if (role != UniversityRole.UNIVERSITY_ADMIN) {
            scopedDepartmentIds = departmentIds == null ? List.of() : departmentIds;
            if (scopedDepartmentIds.isEmpty()) {
                throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, "At least one department is required for this role.");
            }
            for (UUID departmentId : scopedDepartmentIds) {
                if (!departments.existsByIdAndUniversityId(departmentId, universityId)) {
                    throw new ApiException("DEPARTMENT_NOT_IN_UNIVERSITY", HttpStatus.BAD_REQUEST, "One or more departments do not belong to this university.");
                }
                membershipDepartments.save(UniversityMembershipDepartment.assign(membership.getId(), departmentId));
            }
        }

        audit.record("UNIVERSITY_STAFF_ASSIGNED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";targetUserId=" + target.getId() + ";role=" + role);

        return new StaffMember(membership, target.getEmail(), scopedDepartmentIds);
    }

    @Transactional
    public void revoke(UUID actingUserId, UUID universityId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        UniversityMembership membership = memberships.findById(membershipId)
                .filter(m -> m.getUniversityId().equals(universityId))
                .orElseThrow(() -> new ApiException("STAFF_MEMBERSHIP_NOT_FOUND", HttpStatus.NOT_FOUND, "Staff membership not found."));

        if (!membership.isActive()) {
            throw new ApiException("STAFF_MEMBERSHIP_NOT_FOUND", HttpStatus.NOT_FOUND, "Staff membership not found.");
        }

        membership.revoke();
        memberships.save(membership);

        audit.record("UNIVERSITY_STAFF_REVOKED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";membershipId=" + membershipId);
    }

    @Transactional(readOnly = true)
    public List<StaffMember> listStaff(UUID actingUserId, UUID universityId) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        return memberships.findByUniversityId(universityId).stream()
                .filter(UniversityMembership::isActive)
                .map(membership -> {
                    String email = users.findById(membership.getUserId()).map(User::getEmail).orElse(null);
                    List<UUID> departmentIds = membershipDepartments.findActiveByMembershipId(membership.getId()).stream()
                            .map(UniversityMembershipDepartment::getDepartmentId)
                            .filter(Objects::nonNull)
                            .toList();
                    return new StaffMember(membership, email, departmentIds);
                })
                .toList();
    }
}
