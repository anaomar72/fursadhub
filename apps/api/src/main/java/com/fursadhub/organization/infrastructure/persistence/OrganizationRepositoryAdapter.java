package com.fursadhub.organization.infrastructure.persistence;

import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.PublicOrganizationFilter;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Repository
class OrganizationRepositoryAdapter implements OrganizationRepository {

    private final JpaOrganizationRepository jpaRepository;

    OrganizationRepositoryAdapter(JpaOrganizationRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Organization save(Organization organization) {
        return jpaRepository.save(organization);
    }

    @Override
    public Optional<Organization> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Organization> findAllById(Collection<UUID> ids) {
        // Short-circuit: an empty IN () list is invalid SQL on PostgreSQL, and an empty page has
        // nothing to hydrate anyway.
        return ids.isEmpty() ? List.of() : jpaRepository.findAllById(ids);
    }

    @Override
    public Page<Organization> searchPublicDirectory(PublicOrganizationFilter filter, Pageable pageable) {
        // Empty string, never null — see the Javadoc on the query. An absent filter must not reach
        // PostgreSQL as an untyped null, and must short-circuit its own clause.
        return jpaRepository.searchPublicDirectory(
                filter.type(),
                lowerOrEmpty(filter.industry()),
                lowerOrEmpty(filter.city()),
                upperOrEmpty(filter.country()),
                blankToEmpty(filter.query()),
                pageable);
    }

    private String blankToEmpty(String value) {
        return (value == null || value.isBlank()) ? "" : value.trim();
    }

    /** Lower-cased so the exact match is case-insensitive whichever case the caller sent. */
    private String lowerOrEmpty(String value) {
        return blankToEmpty(value).toLowerCase(Locale.ROOT);
    }

    /** Country codes are stored upper-cased, so the filter is upper-cased to match. */
    private String upperOrEmpty(String value) {
        return blankToEmpty(value).toUpperCase(Locale.ROOT);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return jpaRepository.existsBySlug(slug);
    }

    @Override
    public Page<Organization> search(InstitutionVerificationStatus status, String nameFragment, Pageable pageable) {
        // Empty string, never null — see the Javadoc on the query.
        String fragment = (nameFragment == null || nameFragment.isBlank()) ? "" : nameFragment.trim();
        return jpaRepository.search(status, fragment, pageable);
    }

    @Override
    public long countByVerificationStatus(InstitutionVerificationStatus status) {
        return jpaRepository.countByVerificationStatus(status);
    }
}
