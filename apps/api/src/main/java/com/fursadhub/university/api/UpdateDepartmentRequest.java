package com.fursadhub.university.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDepartmentRequest(@NotBlank @Size(max = 255) String name) {
}
