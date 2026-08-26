package com.fursadhub.administration.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlatformAdminRepository {

    PlatformAdmin save(PlatformAdmin admin);

    Optional<PlatformAdmin> findById(UUID id);

    /** Active grants only — a revoked grant confers nothing. */
    List<PlatformAdmin> findActiveByUserId(UUID userId);

    Optional<PlatformAdmin> findActiveByUserIdAndRole(UUID userId, PlatformRole role);

    /** Every grant ever made, revoked ones included, for the admin console's history view. */
    List<PlatformAdmin> findAllOrderByGrantedAtDesc();

    boolean existsAnyActive();
}
