package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.PlacementEvaluation;
import com.fursadhub.internshipmanagement.domain.PlacementEvaluationRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class PlacementEvaluationRepositoryAdapter implements PlacementEvaluationRepository {

    private final JpaPlacementEvaluationRepository jpaRepository;

    PlacementEvaluationRepositoryAdapter(JpaPlacementEvaluationRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public PlacementEvaluation save(PlacementEvaluation evaluation) {
        return jpaRepository.save(evaluation);
    }

    @Override
    public PlacementEvaluation saveAndFlush(PlacementEvaluation evaluation) {
        return jpaRepository.saveAndFlush(evaluation);
    }

    @Override
    public Optional<PlacementEvaluation> findByPlacementId(UUID placementId) {
        return jpaRepository.findByPlacementId(placementId);
    }

    @Override
    public Optional<PlacementEvaluation> findByPlacementIdForUpdate(UUID placementId) {
        return jpaRepository.findByPlacementIdForUpdate(placementId);
    }
}
