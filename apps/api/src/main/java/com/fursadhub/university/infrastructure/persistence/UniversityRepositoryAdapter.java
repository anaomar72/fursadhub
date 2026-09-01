package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class UniversityRepositoryAdapter implements UniversityRepository {

    private final JpaUniversityRepository jpaRepository;

    UniversityRepositoryAdapter(JpaUniversityRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public University save(University university) {
        return jpaRepository.save(university);
    }

    @Override
    public Optional<University> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<University> findAll() {
        return jpaRepository.findAll();
    }

    @Override
    public boolean existsBySlug(String slug) {
        return jpaRepository.existsBySlug(slug);
    }

    @Override
    public Page<University> search(InstitutionVerificationStatus status, String nameFragment, Pageable pageable) {
        // Empty string, never null — see the Javadoc on the query.
        String fragment = (nameFragment == null || nameFragment.isBlank()) ? "" : nameFragment.trim();
        return jpaRepository.search(status, fragment, pageable);
    }

    @Override
    public long countByStatus(InstitutionVerificationStatus status) {
        return jpaRepository.countByStatus(status);
    }
}
