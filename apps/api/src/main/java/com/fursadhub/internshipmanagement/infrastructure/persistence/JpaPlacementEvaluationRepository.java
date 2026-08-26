package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.PlacementEvaluation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

interface JpaPlacementEvaluationRepository extends JpaRepository<PlacementEvaluation, UUID> {

    Optional<PlacementEvaluation> findByPlacementId(UUID placementId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM PlacementEvaluation e WHERE e.placementId = :placementId")
    Optional<PlacementEvaluation> findByPlacementIdForUpdate(@Param("placementId") UUID placementId);
}
