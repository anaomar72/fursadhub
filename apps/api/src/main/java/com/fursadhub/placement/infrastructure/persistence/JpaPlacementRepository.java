package com.fursadhub.placement.infrastructure.persistence;

import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaPlacementRepository extends JpaRepository<Placement, UUID> {

    Optional<Placement> findByCandidacyId(UUID candidacyId);

    List<Placement> findByStudentUserIdOrderByCreatedAtDesc(UUID studentUserId);

    boolean existsByStudentUserIdAndStatusIn(UUID studentUserId, List<PlacementStatus> statuses);
}
