package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaPlatformAdminRepository extends JpaRepository<PlatformAdmin, UUID> {

    List<PlatformAdmin> findByUserIdAndRevokedAtIsNull(UUID userId);

    Optional<PlatformAdmin> findByUserIdAndRoleAndRevokedAtIsNull(UUID userId, PlatformRole role);

    List<PlatformAdmin> findAllByOrderByGrantedAtDesc();

    boolean existsByRevokedAtIsNull();
}
