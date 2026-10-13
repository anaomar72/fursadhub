package com.fursadhub.administration.domain;

import java.util.Optional;
import java.util.UUID;

public interface PlatformCustomRoleRepository {

    PlatformCustomRole save(PlatformCustomRole role);

    Optional<PlatformCustomRole> findById(UUID id);
}
