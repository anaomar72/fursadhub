package com.fursadhub.identity.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository {

    User save(User user);

    Optional<User> findById(UUID id);

    Optional<User> findByEmail(String normalizedEmail);

    boolean existsByEmail(String normalizedEmail);

    /**
     * Paged account lookup for the Phase 7 admin console. Both filters are optional; matching on
     * email is a case-insensitive substring, since an administrator handling a support request
     * typically has a partial address rather than an exact one.
     *
     * <p>Paged rather than list-returning on purpose: this is the one query in FursadHub that can
     * legitimately touch every account, and it must not be able to load them all into memory.
     */
    Page<User> search(String emailFragment, UserStatus status, Pageable pageable);
}
