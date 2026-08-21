package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaDepartmentRepository extends JpaRepository<Department, UUID> {

    List<Department> findByUniversityId(UUID universityId);

    boolean existsByIdAndUniversityId(UUID id, UUID universityId);
}
