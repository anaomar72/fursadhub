package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.UniversityMembershipDepartment;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
class UniversityMembershipDepartmentRepositoryAdapter implements UniversityMembershipDepartmentRepository {

    private final JpaUniversityMembershipDepartmentRepository jpaRepository;

    UniversityMembershipDepartmentRepositoryAdapter(JpaUniversityMembershipDepartmentRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public UniversityMembershipDepartment save(UniversityMembershipDepartment scope) {
        return jpaRepository.save(scope);
    }

    @Override
    public List<UniversityMembershipDepartment> findActiveByMembershipId(UUID membershipId) {
        return jpaRepository.findByMembershipIdAndRemovedAtIsNull(membershipId);
    }

    @Override
    public boolean existsActiveForMembershipAndDepartment(UUID membershipId, UUID departmentId) {
        return jpaRepository.existsByMembershipIdAndDepartmentIdAndRemovedAtIsNull(membershipId, departmentId);
    }
}
