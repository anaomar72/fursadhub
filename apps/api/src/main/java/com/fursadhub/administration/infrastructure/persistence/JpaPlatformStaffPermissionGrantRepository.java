package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformStaffPermissionGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaPlatformStaffPermissionGrantRepository extends JpaRepository<PlatformStaffPermissionGrant, UUID> {

    List<PlatformStaffPermissionGrant> findByUserIdAndRevokedAtIsNull(UUID userId);
}
