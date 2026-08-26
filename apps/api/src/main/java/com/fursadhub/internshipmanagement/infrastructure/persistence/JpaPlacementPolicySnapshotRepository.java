package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.PlacementPolicySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface JpaPlacementPolicySnapshotRepository extends JpaRepository<PlacementPolicySnapshot, UUID> {

    Optional<PlacementPolicySnapshot> findByPlacementId(UUID placementId);
}
