package com.fursadhub.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "fursadhub.auth")
public record AuthProperties(
        Duration refreshTokenTtl,
        Duration emailVerificationTokenTtl,
        Duration passwordResetTokenTtl,
        Duration emailVerificationResendCooldown) {
}
