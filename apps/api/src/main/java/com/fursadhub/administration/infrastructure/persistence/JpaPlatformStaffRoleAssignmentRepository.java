package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformStaffRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaPlatformStaffRoleAssignmentRepository extends JpaRepository<PlatformStaffRoleAssignment, UUID> {

    List<PlatformStaffRoleAssignment> findByCustomRoleIdAndRevokedAtIsNull(UUID customRoleId);
}
