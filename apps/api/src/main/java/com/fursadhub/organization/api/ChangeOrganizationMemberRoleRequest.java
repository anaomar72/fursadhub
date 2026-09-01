package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.OrganizationRole;
import jakarta.validation.constraints.NotNull;

/** Changes a staff member's role. Organization roles carry no sub-tenant scope. */
public record ChangeOrganizationMemberRoleRequest(@NotNull OrganizationRole role) {
}
