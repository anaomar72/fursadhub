package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.DefenseAttempt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaDefenseAttemptRepository extends JpaRepository<DefenseAttempt, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DefenseAttempt d WHERE d.id = :id")
    Optional<DefenseAttempt> findByIdForUpdate(@Param("id") UUID id);

    List<DefenseAttempt> findByPlacementIdOrderByAttemptNumberAsc(UUID placementId);

    /** Cancelled attempts count too: attempt numbers are never reused, so history stays unambiguous. */
    @Query("SELECT coalesce(max(d.attemptNumber), 0) FROM DefenseAttempt d WHERE d.placementId = :placementId")
    int highestAttemptNumber(@Param("placementId") UUID placementId);

    @Query("SELECT count(d) > 0 FROM DefenseAttempt d WHERE d.placementId = :placementId "
            + "AND d.state = com.fursadhub.internshipmanagement.domain.DefenseAttemptState.COMPLETED "
            + "AND d.result = com.fursadhub.internshipmanagement.domain.DefenseResult.PASSED")
    boolean existsPassed(@Param("placementId") UUID placementId);

    @Query("SELECT count(d) > 0 FROM DefenseAttempt d WHERE d.placementId = :placementId "
            + "AND d.state = com.fursadhub.internshipmanagement.domain.DefenseAttemptState.SCHEDULED")
    boolean existsOpen(@Param("placementId") UUID placementId);
}
