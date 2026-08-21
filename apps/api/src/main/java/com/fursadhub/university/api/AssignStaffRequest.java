package com.fursadhub.university.api;

import com.fursadhub.university.domain.UniversityRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record AssignStaffRequest(
        @NotEmpty @Email String email,
        @NotNull UniversityRole role,
        List<UUID> departmentIds) {
}
