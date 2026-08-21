package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
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
    public Optional<University> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<University> findAll() {
        return jpaRepository.findAll();
    }
}
