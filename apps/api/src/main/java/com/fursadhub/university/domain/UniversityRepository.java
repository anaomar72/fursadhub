package com.fursadhub.university.domain;

import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UniversityRepository {

    University save(University university);

    Optional<University> findById(UUID id);

    List<University> findAll();

    boolean existsBySlug(String slug);

    /**
     * Paged university listing for the platform verification queue. Status is optional so one query
     * serves both "the review queue" and "every university".
     */
    Page<University> search(InstitutionVerificationStatus status, String nameFragment, Pageable pageable);

    long countByStatus(InstitutionVerificationStatus status);
}
