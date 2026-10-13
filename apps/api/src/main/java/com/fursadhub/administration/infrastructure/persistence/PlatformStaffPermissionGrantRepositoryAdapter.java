package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformStaffPermissionGrant;
import com.fursadhub.administration.domain.PlatformStaffPermissionGrantRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class PlatformStaffPermissionGrantRepositoryAdapter implements PlatformStaffPermissionGrantRepository {

    private final JpaPlatformStaffPermissionGrantRepository jpaRepository;

    PlatformStaffPermissionGrantRepositoryAdapter(JpaPlatformStaffPermissionGrantRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    /** Flushes for the same reason as {@code PlatformAdminRepositoryAdapter}: the partial unique index decides races. */
    @Override
    public PlatformStaffPermissionGrant save(PlatformStaffPermissionGrant grant) {
        return jpaRepository.saveAndFlush(grant);
    }

    @Override
    public Optional<PlatformStaffPermissionGrant> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<PlatformStaffPermissionGrant> findActiveByUserId(UUID userId) {
        return jpaRepository.findByUserIdAndRevokedAtIsNull(userId);
    }
}
