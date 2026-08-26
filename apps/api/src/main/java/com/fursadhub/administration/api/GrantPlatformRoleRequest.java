package com.fursadhub.administration.api;

import com.fursadhub.administration.domain.PlatformRole;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record GrantPlatformRoleRequest(@NotNull UUID userId, @NotNull PlatformRole role) {
}
