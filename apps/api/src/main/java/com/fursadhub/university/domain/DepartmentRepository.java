package com.fursadhub.university.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DepartmentRepository {

    Department save(Department department);

    Optional<Department> findById(UUID id);

    List<Department> findByUniversityId(UUID universityId);

    boolean existsByIdAndUniversityId(UUID id, UUID universityId);

    /** Enforces `uk_departments_university_code` in Java before the insert reaches the database. */
    boolean existsByUniversityIdAndCode(UUID universityId, String code);
}
