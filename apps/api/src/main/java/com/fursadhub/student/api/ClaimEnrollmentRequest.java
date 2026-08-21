package com.fursadhub.student.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ClaimEnrollmentRequest(
        @NotNull UUID universityId,
        @NotNull UUID departmentId,
        @NotBlank @Size(max = 60) String studentNumber,
        @NotBlank @Size(max = 255) String program,
        @NotBlank @Size(max = 20) String academicYear) {
}
