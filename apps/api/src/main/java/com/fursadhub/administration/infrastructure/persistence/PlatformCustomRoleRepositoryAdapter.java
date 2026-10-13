package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformCustomRole;
import com.fursadhub.administration.domain.PlatformCustomRoleRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class PlatformCustomRoleRepositoryAdapter implements PlatformCustomRoleRepository {

    private final JpaPlatformCustomRoleRepository jpaRepository;

    PlatformCustomRoleRepositoryAdapter(JpaPlatformCustomRoleRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    /**
     * Flushes so a duplicate name (unique index) or a stale version (optimistic lock) surfaces inside
     * the calling service, where it can become a conflict response, rather than at commit.
     */
    @Override
    public PlatformCustomRole save(PlatformCustomRole role) {
        return jpaRepository.saveAndFlush(role);
    }

    @Override
    public Optional<PlatformCustomRole> findById(UUID id) {
        return jpaRepository.findById(id);
    }
}
