package com.fursadhub.university.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 40) String code) {
}
