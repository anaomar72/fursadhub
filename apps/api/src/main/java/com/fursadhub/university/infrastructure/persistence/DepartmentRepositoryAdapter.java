package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.DepartmentRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class DepartmentRepositoryAdapter implements DepartmentRepository {

    private final JpaDepartmentRepository jpaRepository;

    DepartmentRepositoryAdapter(JpaDepartmentRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Department save(Department department) {
        return jpaRepository.save(department);
    }

    @Override
    public Optional<Department> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Department> findByUniversityId(UUID universityId) {
        return jpaRepository.findByUniversityId(universityId);
    }

    @Override
    public boolean existsByIdAndUniversityId(UUID id, UUID universityId) {
        return jpaRepository.existsByIdAndUniversityId(id, universityId);
    }

    @Override
    public boolean existsByUniversityIdAndCode(UUID universityId, String code) {
        return jpaRepository.existsByUniversityIdAndCode(universityId, code);
    }
}
