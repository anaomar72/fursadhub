package com.fursadhub.identity.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository {

    User save(User user);

    /**
     * Saves and FLUSHES, so a unique-constraint violation is raised here rather than at commit
     * (Backend Phase B5.5).
     *
     * <p>It matters for the username paths: a violation surfacing at commit escapes from inside the
     * transactional proxy and may arrive as a {@code TransactionSystemException} rather than a
     * {@code DataIntegrityViolationException}, which would slip past the constraint translator and
     * become a 500. Flushing explicitly pins the failure to a known statement.
     */
    User saveAndFlush(User user);

    Optional<User> findById(UUID id);

    Optional<User> findByEmail(String normalizedEmail);

    /** Lookup by the canonical lowercase username (Backend Phase B5.5). */
    Optional<User> findByUsername(String canonicalUsername);

    boolean existsByEmail(String normalizedEmail);

    boolean existsByUsername(String canonicalUsername);

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
