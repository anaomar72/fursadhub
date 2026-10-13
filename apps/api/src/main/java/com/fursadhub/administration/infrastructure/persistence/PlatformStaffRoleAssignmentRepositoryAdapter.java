package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformStaffRoleAssignment;
import com.fursadhub.administration.domain.PlatformStaffRoleAssignmentRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class PlatformStaffRoleAssignmentRepositoryAdapter implements PlatformStaffRoleAssignmentRepository {

    private final JpaPlatformStaffRoleAssignmentRepository jpaRepository;

    PlatformStaffRoleAssignmentRepositoryAdapter(JpaPlatformStaffRoleAssignmentRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    /** Flushes for the same reason as {@code PlatformAdminRepositoryAdapter}: the partial unique index decides races. */
    @Override
    public PlatformStaffRoleAssignment save(PlatformStaffRoleAssignment assignment) {
        return jpaRepository.saveAndFlush(assignment);
    }

    @Override
    public Optional<PlatformStaffRoleAssignment> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<PlatformStaffRoleAssignment> findActiveByCustomRoleId(UUID customRoleId) {
        return jpaRepository.findByCustomRoleIdAndRevokedAtIsNull(customRoleId);
    }
}
