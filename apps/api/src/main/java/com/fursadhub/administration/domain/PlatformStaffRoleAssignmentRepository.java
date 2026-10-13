package com.fursadhub.administration.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlatformStaffRoleAssignmentRepository {

    PlatformStaffRoleAssignment save(PlatformStaffRoleAssignment assignment);

    Optional<PlatformStaffRoleAssignment> findById(UUID id);

    /** Active holders of a role — the affected-staff review before a role is edited or deactivated. */
    List<PlatformStaffRoleAssignment> findActiveByCustomRoleId(UUID customRoleId);
}
