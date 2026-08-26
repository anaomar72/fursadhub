package com.fursadhub.internshipmanagement.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WeeklyLogRepository {

    WeeklyLog save(WeeklyLog log);

    /**
     * Writes immediately so a duplicate {@code (placement_id, week_number)} is rejected inside the
     * create call, where it can be turned into WEEKLY_LOG_ALREADY_EXISTS, rather than surfacing as
     * an opaque failure at commit.
     */
    WeeklyLog saveAndFlush(WeeklyLog log);

    Optional<WeeklyLog> findById(UUID id);

    /** SELECT ... FOR UPDATE, so two concurrent submit/review commands on one log are serialized. */
    Optional<WeeklyLog> findByIdForUpdate(UUID id);

    List<WeeklyLog> findByPlacementIdOrderByWeekNumber(UUID placementId);

    long countByPlacementIdAndState(UUID placementId, WeeklyLogState state);
}
