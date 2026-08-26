package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformAdminRepository;
import com.fursadhub.administration.domain.PlatformRole;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class PlatformAdminRepositoryAdapter implements PlatformAdminRepository {

    private final JpaPlatformAdminRepository jpaRepository;

    PlatformAdminRepositoryAdapter(JpaPlatformAdminRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    /**
     * Flushes deliberately. The active-grant uniqueness is a partial unique INDEX, so a concurrent
     * duplicate is caught by PostgreSQL rather than by Java — and with a plain {@code save()} the
     * INSERT would not run until commit, where the violation escapes the calling service's handling
     * and surfaces as a 500. Flushing here puts the failure where the service can turn it into a
     * proper conflict response.
     */
    @Override
    public PlatformAdmin save(PlatformAdmin admin) {
        return jpaRepository.saveAndFlush(admin);
    }

    @Override
    public Optional<PlatformAdmin> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<PlatformAdmin> findActiveByUserId(UUID userId) {
        return jpaRepository.findByUserIdAndRevokedAtIsNull(userId);
    }

    @Override
    public Optional<PlatformAdmin> findActiveByUserIdAndRole(UUID userId, PlatformRole role) {
        return jpaRepository.findByUserIdAndRoleAndRevokedAtIsNull(userId, role);
    }

    @Override
    public List<PlatformAdmin> findAllOrderByGrantedAtDesc() {
        return jpaRepository.findAllByOrderByGrantedAtDesc();
    }

    @Override
    public boolean existsAnyActive() {
        return jpaRepository.existsByRevokedAtIsNull();
    }
}
