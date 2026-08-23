package com.fursadhub.placement.infrastructure.persistence;

import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementStatus;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class PlacementRepositoryAdapter implements PlacementRepository {

    /** "Live" mirrors the partial unique index in V22 that enforces one active placement per student. */
    private static final List<PlacementStatus> LIVE_STATUSES =
            List.of(PlacementStatus.PLANNED, PlacementStatus.ACTIVE, PlacementStatus.COMPLETION_PENDING);

    private final JpaPlacementRepository jpaRepository;

    PlacementRepositoryAdapter(JpaPlacementRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Placement save(Placement placement) {
        return jpaRepository.save(placement);
    }

    @Override
    public Optional<Placement> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<Placement> findByCandidacyId(UUID candidacyId) {
        return jpaRepository.findByCandidacyId(candidacyId);
    }

    @Override
    public List<Placement> findByStudentUserId(UUID studentUserId) {
        return jpaRepository.findByStudentUserIdOrderByCreatedAtDesc(studentUserId);
    }

    @Override
    public boolean existsLiveByStudentUserId(UUID studentUserId) {
        return jpaRepository.existsByStudentUserIdAndStatusIn(studentUserId, LIVE_STATUSES);
    }
}
