package com.fursadhub.organization.domain;

import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository {

    Organization save(Organization organization);

    Optional<Organization> findById(UUID id);

    boolean existsBySlug(String slug);

    /**
     * Paged organization listing for the Phase 7 platform verification queue. Status is optional so
     * one query serves both "the review queue" and "every organization".
     */
    Page<Organization> search(InstitutionVerificationStatus status, String nameFragment, Pageable pageable);

    long countByVerificationStatus(InstitutionVerificationStatus status);
}
