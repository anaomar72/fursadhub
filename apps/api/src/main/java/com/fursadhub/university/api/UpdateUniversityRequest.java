package com.fursadhub.university.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUniversityRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 120) String city,
        @Size(max = 120) String registrationNumber,
        @Size(max = 255) String website,
        @Size(max = 2000) String description) {
}
