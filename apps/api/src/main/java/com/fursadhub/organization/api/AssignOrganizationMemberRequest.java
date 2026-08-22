package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.OrganizationRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssignOrganizationMemberRequest(
        @NotBlank @Email String email,
        @NotNull OrganizationRole role) {
}
