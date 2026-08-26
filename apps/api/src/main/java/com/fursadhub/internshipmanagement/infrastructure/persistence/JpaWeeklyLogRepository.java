package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.WeeklyLog;
import com.fursadhub.internshipmanagement.domain.WeeklyLogState;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaWeeklyLogRepository extends JpaRepository<WeeklyLog, UUID> {

    /** SELECT ... FOR UPDATE, so concurrent submit/review commands on one log are serialized. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM WeeklyLog w WHERE w.id = :id")
    Optional<WeeklyLog> findByIdForUpdate(@Param("id") UUID id);

    List<WeeklyLog> findByPlacementIdOrderByWeekNumberAsc(UUID placementId);

    long countByPlacementIdAndState(UUID placementId, WeeklyLogState state);
}
