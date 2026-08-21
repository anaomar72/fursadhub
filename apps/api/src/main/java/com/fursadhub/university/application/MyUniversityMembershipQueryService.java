package com.fursadhub.university.application;

import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipDepartment;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Lets the frontend discover which university (if any) the current user has an active staff
 * membership at, so it knows which {@code /universities/{universityId}/...} resources to call
 * (CLAUDE.md section 15 — current membership must come from PostgreSQL, never a JWT claim).
 */
@Service
@Transactional(readOnly = true)
public class MyUniversityMembershipQueryService {

    private final UniversityMembershipRepository memberships;
    private final UniversityMembershipDepartmentRepository membershipDepartments;

    public MyUniversityMembershipQueryService(
            UniversityMembershipRepository memberships, UniversityMembershipDepartmentRepository membershipDepartments) {
        this.memberships = memberships;
        this.membershipDepartments = membershipDepartments;
    }

    public record MyMembership(UniversityMembership membership, List<UUID> departmentIds) {
    }

    public Optional<MyMembership> getMyMembership(UUID userId) {
        return memberships.findActiveByUserId(userId).map(membership -> {
            List<UUID> departmentIds = membership.getRole() == UniversityRole.UNIVERSITY_ADMIN
                    ? List.of()
                    : membershipDepartments.findActiveByMembershipId(membership.getId()).stream()
                            .map(UniversityMembershipDepartment::getDepartmentId)
                            .toList();
            return new MyMembership(membership, departmentIds);
        });
    }
}
