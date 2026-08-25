package com.fursadhub.placement.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlacementRepository {

    Placement save(Placement placement);

    Optional<Placement> findById(UUID id);

    /**
     * Reads the placement row with {@code SELECT ... FOR UPDATE}. Every mutating Phase 5 command
     * opens with this, so concurrent lifecycle transitions and supervisor assignments on the same
     * placement are serialized by PostgreSQL rather than racing (CLAUDE.md section 54). Mirrors the
     * Phase 4 pattern on {@code InternshipOfferRepository#findByIdForUpdate}.
     */
    Optional<Placement> findByIdForUpdate(UUID id);

    Optional<Placement> findByCandidacyId(UUID candidacyId);

    List<Placement> findByStudentUserId(UUID studentUserId);

    List<Placement> findByOrganizationId(UUID organizationId);

    List<Placement> findByUniversityId(UUID universityId);

    /** Department-scoped listing for coordinators, whose scope is a subset of their university. */
    List<Placement> findByUniversityIdAndDepartmentIdIn(UUID universityId, Collection<UUID> departmentIds);

    List<Placement> findByIdIn(Collection<UUID> ids);

    /**
     * Student availability for the pilot is DERIVED from placements rather than stored as a separate
     * flag that could drift (see V22). A student holding a live placement is unavailable.
     */
    boolean existsLiveByStudentUserId(UUID studentUserId);
}
