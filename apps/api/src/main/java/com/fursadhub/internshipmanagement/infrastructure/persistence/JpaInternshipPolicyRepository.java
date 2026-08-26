package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.InternshipPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface JpaInternshipPolicyRepository extends JpaRepository<InternshipPolicy, UUID> {

    Optional<InternshipPolicy> findByUniversityIdAndDepartmentIdIsNull(UUID universityId);

    Optional<InternshipPolicy> findByUniversityIdAndDepartmentId(UUID universityId, UUID departmentId);
}
