package com.fursadhub.administration.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Assigns the one-time login username to an existing verification officer (Backend Phase B5.6) —
 * the platform counterpart of {@code AssignOrganizationMemberUsernameRequest}.
 *
 * <p>{@code @NotBlank} is sufficient where B5's display-name command needed presence-awareness:
 * there is no clear operation for a username, so an omitted value is simply invalid rather than
 * ambiguous between "leave alone" and "erase".
 */
public record AssignPlatformUsernameRequest(@NotBlank String username) {
}
