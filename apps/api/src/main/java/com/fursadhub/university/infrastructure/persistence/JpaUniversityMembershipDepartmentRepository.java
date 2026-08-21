package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.UniversityMembershipDepartment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaUniversityMembershipDepartmentRepository extends JpaRepository<UniversityMembershipDepartment, UUID> {

    List<UniversityMembershipDepartment> findByMembershipIdAndRemovedAtIsNull(UUID membershipId);

    boolean existsByMembershipIdAndDepartmentIdAndRemovedAtIsNull(UUID membershipId, UUID departmentId);
}
