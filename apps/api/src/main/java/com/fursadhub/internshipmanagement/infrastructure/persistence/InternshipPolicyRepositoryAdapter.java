package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.InternshipPolicy;
import com.fursadhub.internshipmanagement.domain.InternshipPolicyRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class InternshipPolicyRepositoryAdapter implements InternshipPolicyRepository {

    private final JpaInternshipPolicyRepository jpaRepository;

    InternshipPolicyRepositoryAdapter(JpaInternshipPolicyRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public InternshipPolicy save(InternshipPolicy policy) {
        return jpaRepository.save(policy);
    }

    @Override
    public Optional<InternshipPolicy> findUniversityDefault(UUID universityId) {
        return jpaRepository.findByUniversityIdAndDepartmentIdIsNull(universityId);
    }

    @Override
    public Optional<InternshipPolicy> findDepartmentOverride(UUID universityId, UUID departmentId) {
        return jpaRepository.findByUniversityIdAndDepartmentId(universityId, departmentId);
    }

    @Override
    public void delete(InternshipPolicy policy) {
        jpaRepository.delete(policy);
    }
}
