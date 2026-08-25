package com.fursadhub.placement.infrastructure.persistence;

import com.fursadhub.placement.domain.PlacementSupervisorAssignment;
import com.fursadhub.placement.domain.SupervisorType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaPlacementSupervisorAssignmentRepository extends JpaRepository<PlacementSupervisorAssignment, UUID> {

    /**
     * The active assignment is the one that has not been closed. The partial unique index on
     * {@code (placement_id, type) WHERE removed_at IS NULL} guarantees there is at most one, so
     * returning {@link Optional} here is safe rather than optimistic.
     */
    Optional<PlacementSupervisorAssignment> findByPlacementIdAndTypeAndRemovedAtIsNull(
            UUID placementId, SupervisorType type);

    List<PlacementSupervisorAssignment> findByPlacementIdOrderByAssignedAtAsc(UUID placementId);

    List<PlacementSupervisorAssignment> findByPlacementIdInAndRemovedAtIsNull(Collection<UUID> placementIds);

    List<PlacementSupervisorAssignment> findBySupervisorUserIdAndRemovedAtIsNull(UUID supervisorUserId);

    boolean existsByPlacementIdAndSupervisorUserIdAndRemovedAtIsNull(UUID placementId, UUID supervisorUserId);
}
