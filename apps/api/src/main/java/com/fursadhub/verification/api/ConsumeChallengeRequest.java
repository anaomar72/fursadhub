package com.fursadhub.verification.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ConsumeChallengeRequest(@NotBlank @Pattern(regexp = "\\d{6}") String code) {
}
