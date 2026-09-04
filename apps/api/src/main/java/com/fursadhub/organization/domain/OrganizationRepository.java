package com.fursadhub.organization.domain;

import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository {

    Organization save(Organization organization);

    Optional<Organization> findById(UUID id);

    /**
     * Batch lookup, for assembling a page of responses that each embed their organization. Added in
     * Backend Phase B1 to replace the per-row {@code findById} that made every public opportunity
     * page issue one query per result.
     *
     * <p>Ids that do not resolve are simply absent from the result — callers must tolerate a
     * shorter list than they asked for rather than assuming a positional match.
     */
    List<Organization> findAllById(Collection<UUID> ids);

    /**
     * The public organization directory (Backend Phase B1).
     *
     * <p>Only {@code VERIFIED} organizations are ever returned, enforced inside the query itself
     * rather than by filtering a broader result — an unverified organization must never become
     * publicly discoverable, including through a page the caller could otherwise scroll past.
     */
    Page<Organization> searchPublicDirectory(PublicOrganizationFilter filter, Pageable pageable);

    boolean existsBySlug(String slug);

    /**
     * Paged organization listing for the Phase 7 platform verification queue. Status is optional so
     * one query serves both "the review queue" and "every organization".
     */
    Page<Organization> search(InstitutionVerificationStatus status, String nameFragment, Pageable pageable);

    long countByVerificationStatus(InstitutionVerificationStatus status);
}
