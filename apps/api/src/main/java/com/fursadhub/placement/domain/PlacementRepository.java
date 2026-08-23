package com.fursadhub.placement.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlacementRepository {

    Placement save(Placement placement);

    Optional<Placement> findById(UUID id);

    Optional<Placement> findByCandidacyId(UUID candidacyId);

    List<Placement> findByStudentUserId(UUID studentUserId);

    /**
     * Student availability for the pilot is DERIVED from placements rather than stored as a separate
     * flag that could drift (see V22). A student holding a live placement is unavailable.
     */
    boolean existsLiveByStudentUserId(UUID studentUserId);
}
