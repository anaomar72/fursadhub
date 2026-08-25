package com.fursadhub.placement.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlacementSupervisorAssignmentRepository {

    PlacementSupervisorAssignment save(PlacementSupervisorAssignment assignment);

    /**
     * Writes the assignment to the database IMMEDIATELY rather than at the end of the transaction.
     *
     * <p>Reassignment closes the current assignment and inserts the replacement in one transaction.
     * Left to its own ordering, JPA performs all inserts before all updates in a flush, so the new
     * row would hit the database while the outgoing row still has {@code removed_at IS NULL} — and
     * {@code uk_psa_one_active_per_type} would correctly reject it. Flushing the close first makes
     * the intended order explicit instead of depending on the provider's flush ordering.
     */
    PlacementSupervisorAssignment saveAndFlush(PlacementSupervisorAssignment assignment);

    /** The currently responsible supervisor of one type, i.e. the row with {@code removed_at IS NULL}. */
    Optional<PlacementSupervisorAssignment> findActive(UUID placementId, SupervisorType type);

    /** Full history for one placement, oldest first — closed assignments included. */
    List<PlacementSupervisorAssignment> findByPlacementIdOrderByAssignedAt(UUID placementId);

    List<PlacementSupervisorAssignment> findActiveByPlacementIdIn(Collection<UUID> placementIds);

    /** The placements a supervisor is currently responsible for — the basis of supervisor scope. */
    List<PlacementSupervisorAssignment> findActiveBySupervisorUserId(UUID supervisorUserId);

    boolean existsActiveForPlacementAndSupervisor(UUID placementId, UUID supervisorUserId);
}
