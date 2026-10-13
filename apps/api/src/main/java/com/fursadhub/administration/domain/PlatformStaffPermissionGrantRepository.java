package com.fursadhub.administration.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlatformStaffPermissionGrantRepository {

    PlatformStaffPermissionGrant save(PlatformStaffPermissionGrant grant);

    Optional<PlatformStaffPermissionGrant> findById(UUID id);

    List<PlatformStaffPermissionGrant> findActiveByUserId(UUID userId);
}
