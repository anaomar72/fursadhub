package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.PlacementPolicySnapshot;
import com.fursadhub.internshipmanagement.domain.PlacementPolicySnapshotRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class PlacementPolicySnapshotRepositoryAdapter implements PlacementPolicySnapshotRepository {

    private final JpaPlacementPolicySnapshotRepository jpaRepository;

    PlacementPolicySnapshotRepositoryAdapter(JpaPlacementPolicySnapshotRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Optional<PlacementPolicySnapshot> findByPlacementId(UUID placementId) {
        return jpaRepository.findByPlacementId(placementId);
    }

    @Override
    public PlacementPolicySnapshot saveAndFlush(PlacementPolicySnapshot snapshot) {
        return jpaRepository.saveAndFlush(snapshot);
    }
}
