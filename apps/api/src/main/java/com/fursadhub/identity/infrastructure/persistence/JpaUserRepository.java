package com.fursadhub.identity.infrastructure.persistence;

import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

interface JpaUserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Admin-console account search. Written as one query rather than four Spring Data derived
     * methods, so the caller does not have to branch on which filters are present.
     *
     * <p>The email filter is ALWAYS a string, never null — an absent filter is the empty string,
     * matching everything. On PostgreSQL a null parameter arrives with no inferred type, so
     * {@code lower()} would be handed a {@code bytea} and the query would fail outright even though
     * a {@code :emailFragment IS NULL} branch would have short-circuited.
     */
    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :emailFragment, '%'))
              AND (:status IS NULL OR u.status = :status)
            """)
    Page<User> search(
            @Param("emailFragment") String emailFragment,
            @Param("status") UserStatus status,
            Pageable pageable);
}
