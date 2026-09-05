package com.fursadhub.organization.infrastructure.persistence;

import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationType;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

interface JpaOrganizationRepository extends JpaRepository<Organization, UUID> {

    boolean existsBySlug(String slug);

    long countByVerificationStatus(InstitutionVerificationStatus status);

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
            SELECT o FROM Organization o
            WHERE (:status IS NULL OR o.verificationStatus = :status)
              AND LOWER(o.name) LIKE LOWER(CONCAT('%', :nameFragment, '%'))
            """)
    Page<Organization> search(
            @Param("status") InstitutionVerificationStatus status,
            @Param("nameFragment") String nameFragment,
            Pageable pageable);

    /**
     * The public directory query (Backend Phase B1).
     *
     * <p>{@code verificationStatus = VERIFIED} is a literal in the query, not a parameter: the
     * caller cannot widen it, and no future refactor can accidentally pass a different status in.
     * That is the whole security property of this endpoint, so it is not left to a call site.
     *
     * <p>{@code nameFragment} follows the same never-null contract as {@link #search} above — see
     * its Javadoc for why a null parameter breaks {@code lower()} on PostgreSQL. {@code type} is an
     * enum, not a string, so the {@code IS NULL OR} form is safe for it.
     *
     * <p>Backend Phase B2's three string filters follow that same contract for the same reason: an
     * absent filter arrives as the EMPTY STRING and short-circuits its clause, never as null. They
     * are exact matches rather than {@code LIKE} — an industry or city filter comes from a chosen
     * value, so substring matching would let "Ban" quietly select "Banking" and "Urban Planning".
     * {@code industry} and {@code city} are compared lower-cased on both sides; {@code countryCode}
     * is already normalised to upper case on write, so it compares directly.
     */
    @Query("""
            SELECT o FROM Organization o
            WHERE o.verificationStatus = com.fursadhub.verification.domain.InstitutionVerificationStatus.VERIFIED
              AND (:type IS NULL OR o.type = :type)
              AND (:industry = '' OR LOWER(o.industry) = :industry)
              AND (:city = '' OR LOWER(o.city) = :city)
              AND (:country = '' OR o.countryCode = :country)
              AND LOWER(o.name) LIKE LOWER(CONCAT('%', :nameFragment, '%'))
            """)
    Page<Organization> searchPublicDirectory(
            @Param("type") OrganizationType type,
            @Param("industry") String industry,
            @Param("city") String city,
            @Param("country") String country,
            @Param("nameFragment") String nameFragment,
            Pageable pageable);
}
