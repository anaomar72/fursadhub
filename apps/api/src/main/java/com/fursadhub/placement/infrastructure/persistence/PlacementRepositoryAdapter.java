package com.fursadhub.placement.infrastructure.persistence;

import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementStatus;
import org.springframework.stereotype.Repository;

import java.util.Collection;
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
    public Optional<Placement> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id);
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
    public List<Placement> findByOrganizationId(UUID organizationId) {
        return jpaRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
    }

    @Override
    public List<Placement> findByUniversityId(UUID universityId) {
        return jpaRepository.findByUniversityIdOrderByCreatedAtDesc(universityId);
    }

    @Override
    public List<Placement> findByUniversityIdAndDepartmentIdIn(UUID universityId, Collection<UUID> departmentIds) {
        if (departmentIds.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByUniversityIdAndDepartmentIdInOrderByCreatedAtDesc(universityId, departmentIds);
    }

    @Override
    public List<Placement> findByIdIn(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByIdInOrderByCreatedAtDesc(ids);
    }

    @Override
    public boolean existsLiveByStudentUserId(UUID studentUserId) {
        return jpaRepository.existsByStudentUserIdAndStatusIn(studentUserId, LIVE_STATUSES);
    }
}
