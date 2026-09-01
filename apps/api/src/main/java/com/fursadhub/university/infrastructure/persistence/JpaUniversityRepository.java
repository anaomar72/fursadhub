package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.University;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

interface JpaUniversityRepository extends JpaRepository<University, UUID> {

    boolean existsBySlug(String slug);

    long countByStatus(InstitutionVerificationStatus status);

    /**
     * The name filter is ALWAYS a string, never null — an absent filter is the empty string, which
     * makes the pattern {@code '%%'} and matches everything.
     *
     * <p>The obvious {@code :nameFragment IS NULL OR LOWER(...)} form does not work on PostgreSQL: a
     * null parameter arrives with no inferred type, so {@code lower()} is handed a {@code bytea} and
     * the whole query fails with "function lower(bytea) does not exist" — even though the null branch
     * would have short-circuited. Keeping the parameter non-null side-steps the inference problem
     * entirely rather than papering over it with a cast.
     */
    @Query("""
            SELECT u FROM University u
            WHERE (:status IS NULL OR u.status = :status)
              AND LOWER(u.name) LIKE LOWER(CONCAT('%', :nameFragment, '%'))
            """)
    Page<University> search(
            @Param("status") InstitutionVerificationStatus status,
            @Param("nameFragment") String nameFragment,
            Pageable pageable);
}
