package com.fursadhub.internshipmanagement.domain;

import java.util.Optional;
import java.util.UUID;

public interface PlacementEvaluationRepository {

    PlacementEvaluation save(PlacementEvaluation evaluation);

    PlacementEvaluation saveAndFlush(PlacementEvaluation evaluation);

    Optional<PlacementEvaluation> findByPlacementId(UUID placementId);

    /**
     * SELECT ... FOR UPDATE on the evaluation row. Every mutating command opens with this so a
     * double-clicked finalize cannot be applied twice.
     */
    Optional<PlacementEvaluation> findByPlacementIdForUpdate(UUID placementId);
}
