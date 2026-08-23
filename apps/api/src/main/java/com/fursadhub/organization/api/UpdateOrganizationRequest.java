package com.fursadhub.organization.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateOrganizationRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 120) String registrationNumber,
        @Size(max = 255) String website,
        @Size(max = 2000) String description) {
}
