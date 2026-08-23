package com.fursadhub.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * {@code loginMaxAttemptsPerEmail}/{@code loginMaxAttemptsPerIp} were extracted from hard-coded
 * constants in {@code LoginService} during Phase 4 so the per-IP ceiling can be raised for the
 * integration-test profile only. Every integration test necessarily logs in from 127.0.0.1, so a
 * large suite trips a limit that exists to stop real credential-stuffing — an artifact of testing,
 * not a property worth weakening in production. Production defaults are unchanged (10 per email,
 * 30 per IP, both per 15 minutes), and the per-email limit is deliberately NOT relaxed anywhere.
 */
@ConfigurationProperties(prefix = "fursadhub.auth")
public record AuthProperties(
        Duration refreshTokenTtl,
        Duration emailVerificationTokenTtl,
        Duration passwordResetTokenTtl,
        Duration emailVerificationResendCooldown,
        int loginMaxAttemptsPerEmail,
        int loginMaxAttemptsPerIp) {
}
