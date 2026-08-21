package com.fursadhub.identity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository {

    RefreshToken save(RefreshToken token);

    /** Locks the row for update so concurrent refresh attempts on the same token cannot both succeed. */
    Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash);

    List<RefreshToken> findActiveByFamilyId(UUID familyId);

    List<RefreshToken> findActiveByUserId(UUID userId);
}
