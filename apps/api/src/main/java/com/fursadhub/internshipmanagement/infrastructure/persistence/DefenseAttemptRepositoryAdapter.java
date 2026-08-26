package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.DefenseAttempt;
import com.fursadhub.internshipmanagement.domain.DefenseAttemptRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class DefenseAttemptRepositoryAdapter implements DefenseAttemptRepository {

    private final JpaDefenseAttemptRepository jpaRepository;

    DefenseAttemptRepositoryAdapter(JpaDefenseAttemptRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public DefenseAttempt save(DefenseAttempt attempt) {
        return jpaRepository.save(attempt);
    }

    @Override
    public DefenseAttempt saveAndFlush(DefenseAttempt attempt) {
        return jpaRepository.saveAndFlush(attempt);
    }

    @Override
    public Optional<DefenseAttempt> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<DefenseAttempt> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id);
    }

    @Override
    public List<DefenseAttempt> findByPlacementIdOrderByAttemptNumber(UUID placementId) {
        return jpaRepository.findByPlacementIdOrderByAttemptNumberAsc(placementId);
    }

    @Override
    public int highestAttemptNumber(UUID placementId) {
        return jpaRepository.highestAttemptNumber(placementId);
    }

    @Override
    public boolean existsPassedByPlacementId(UUID placementId) {
        return jpaRepository.existsPassed(placementId);
    }

    @Override
    public boolean existsOpenByPlacementId(UUID placementId) {
        return jpaRepository.existsOpen(placementId);
    }
}
