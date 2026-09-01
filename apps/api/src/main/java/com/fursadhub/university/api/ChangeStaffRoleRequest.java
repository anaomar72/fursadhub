package com.fursadhub.university.api;

import com.fursadhub.university.domain.UniversityRole;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/** Changes a staff member's role and (atomically) their department scope. */
public record ChangeStaffRoleRequest(@NotNull UniversityRole role, List<UUID> departmentIds) {
}
