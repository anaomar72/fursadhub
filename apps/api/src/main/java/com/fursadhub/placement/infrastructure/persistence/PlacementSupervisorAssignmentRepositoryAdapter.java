package com.fursadhub.placement.infrastructure.persistence;

import com.fursadhub.placement.domain.PlacementSupervisorAssignment;
import com.fursadhub.placement.domain.PlacementSupervisorAssignmentRepository;
import com.fursadhub.placement.domain.SupervisorType;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class PlacementSupervisorAssignmentRepositoryAdapter implements PlacementSupervisorAssignmentRepository {

    private final JpaPlacementSupervisorAssignmentRepository jpaRepository;

    PlacementSupervisorAssignmentRepositoryAdapter(JpaPlacementSupervisorAssignmentRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public PlacementSupervisorAssignment save(PlacementSupervisorAssignment assignment) {
        return jpaRepository.save(assignment);
    }

    @Override
    public PlacementSupervisorAssignment saveAndFlush(PlacementSupervisorAssignment assignment) {
        return jpaRepository.saveAndFlush(assignment);
    }

    @Override
    public Optional<PlacementSupervisorAssignment> findActive(UUID placementId, SupervisorType type) {
        return jpaRepository.findByPlacementIdAndTypeAndRemovedAtIsNull(placementId, type);
    }

    @Override
    public List<PlacementSupervisorAssignment> findByPlacementIdOrderByAssignedAt(UUID placementId) {
        return jpaRepository.findByPlacementIdOrderByAssignedAtAsc(placementId);
    }

    @Override
    public List<PlacementSupervisorAssignment> findActiveByPlacementIdIn(Collection<UUID> placementIds) {
        if (placementIds.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByPlacementIdInAndRemovedAtIsNull(placementIds);
    }

    @Override
    public List<PlacementSupervisorAssignment> findActiveBySupervisorUserId(UUID supervisorUserId) {
        return jpaRepository.findBySupervisorUserIdAndRemovedAtIsNull(supervisorUserId);
    }

    @Override
    public boolean existsActiveForPlacementAndSupervisor(UUID placementId, UUID supervisorUserId) {
        return jpaRepository.existsByPlacementIdAndSupervisorUserIdAndRemovedAtIsNull(placementId, supervisorUserId);
    }
}
