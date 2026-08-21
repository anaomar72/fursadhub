package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class UniversityMembershipRepositoryAdapter implements UniversityMembershipRepository {

    private final JpaUniversityMembershipRepository jpaRepository;

    UniversityMembershipRepositoryAdapter(JpaUniversityMembershipRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public UniversityMembership save(UniversityMembership membership) {
        return jpaRepository.save(membership);
    }

    @Override
    public Optional<UniversityMembership> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<UniversityMembership> findActiveByUniversityIdAndUserId(UUID universityId, UUID userId) {
        return jpaRepository.findByUniversityIdAndUserIdAndRevokedAtIsNull(universityId, userId);
    }

    @Override
    public List<UniversityMembership> findByUniversityId(UUID universityId) {
        return jpaRepository.findByUniversityId(universityId);
    }

    @Override
    public Optional<UniversityMembership> findActiveByUserId(UUID userId) {
        return jpaRepository.findFirstByUserIdAndRevokedAtIsNull(userId);
    }

    @Override
    public boolean existsActiveByUniversityIdAndUserId(UUID universityId, UUID userId) {
        return jpaRepository.existsByUniversityIdAndUserIdAndRevokedAtIsNull(universityId, userId);
    }
}
