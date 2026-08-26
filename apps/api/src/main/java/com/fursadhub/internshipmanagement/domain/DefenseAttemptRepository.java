package com.fursadhub.internshipmanagement.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DefenseAttemptRepository {

    DefenseAttempt save(DefenseAttempt attempt);

    /**
     * Immediate write. Two staff scheduling a retake simultaneously both compute the same next
     * attempt number; flushing here means the loser hits {@code uk_defense_placement_attempt} inside
     * the call and can be reported cleanly instead of creating a second attempt 2.
     */
    DefenseAttempt saveAndFlush(DefenseAttempt attempt);

    Optional<DefenseAttempt> findById(UUID id);

    Optional<DefenseAttempt> findByIdForUpdate(UUID id);

    List<DefenseAttempt> findByPlacementIdOrderByAttemptNumber(UUID placementId);

    /** The highest attempt number written so far, including cancelled attempts. */
    int highestAttemptNumber(UUID placementId);

    boolean existsPassedByPlacementId(UUID placementId);

    boolean existsOpenByPlacementId(UUID placementId);
}
