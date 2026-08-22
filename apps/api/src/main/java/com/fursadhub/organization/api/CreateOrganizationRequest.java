package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.OrganizationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateOrganizationRequest(
        @NotBlank @Size(max = 255) String name,
        @NotNull OrganizationType type,
        @Size(max = 120) String registrationNumber,
        @Size(max = 255) String website,
        @Size(max = 2000) String description) {
}
