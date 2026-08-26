package com.fursadhub.internshipmanagement.domain;

import java.util.Optional;
import java.util.UUID;

public interface PlacementPolicySnapshotRepository {

    Optional<PlacementPolicySnapshot> findByPlacementId(UUID placementId);

    /**
     * Writes the snapshot immediately so a concurrent first-touch of the same placement hits
     * {@code uk_pps_placement} inside this call rather than at commit, letting the resolver catch it
     * and re-read the winner's row (CLAUDE.md section 54).
     */
    PlacementPolicySnapshot saveAndFlush(PlacementPolicySnapshot snapshot);
}
