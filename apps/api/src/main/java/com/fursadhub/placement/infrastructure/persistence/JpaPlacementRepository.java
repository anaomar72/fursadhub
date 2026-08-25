package com.fursadhub.placement.infrastructure.persistence;

import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaPlacementRepository extends JpaRepository<Placement, UUID> {

    /**
     * SELECT ... FOR UPDATE on the placement row. Every Phase 5 lifecycle command and supervisor
     * assignment opens with this, so two concurrent starts (or two concurrent reassignments of the
     * same supervisor type) are serialized by PostgreSQL instead of both reading PLANNED and both
     * writing (CLAUDE.md section 54).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Placement p WHERE p.id = :id")
    Optional<Placement> findByIdForUpdate(@Param("id") UUID id);

    Optional<Placement> findByCandidacyId(UUID candidacyId);

    List<Placement> findByStudentUserIdOrderByCreatedAtDesc(UUID studentUserId);

    List<Placement> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    List<Placement> findByUniversityIdOrderByCreatedAtDesc(UUID universityId);

    List<Placement> findByUniversityIdAndDepartmentIdInOrderByCreatedAtDesc(
            UUID universityId, Collection<UUID> departmentIds);

    List<Placement> findByIdInOrderByCreatedAtDesc(Collection<UUID> ids);

    boolean existsByStudentUserIdAndStatusIn(UUID studentUserId, List<PlacementStatus> statuses);
}
