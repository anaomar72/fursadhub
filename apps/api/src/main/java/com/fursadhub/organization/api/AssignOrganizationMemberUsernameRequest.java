package com.fursadhub.organization.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Assigns the one-time login username to an existing managed staff account (Backend Phase B5.5) —
 * the organization counterpart of {@code AssignStaffUsernameRequest}. See it for why {@code @NotBlank}
 * is sufficient here where B5's display-name command needed presence-awareness: there is no clear
 * operation, so an omitted value is simply invalid rather than ambiguous.
 */
public record AssignOrganizationMemberUsernameRequest(@NotBlank String username) {
}
