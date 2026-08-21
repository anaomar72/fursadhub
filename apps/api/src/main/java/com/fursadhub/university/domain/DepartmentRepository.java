package com.fursadhub.university.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DepartmentRepository {

    Optional<Department> findById(UUID id);

    List<Department> findByUniversityId(UUID universityId);

    boolean existsByIdAndUniversityId(UUID id, UUID universityId);
}
