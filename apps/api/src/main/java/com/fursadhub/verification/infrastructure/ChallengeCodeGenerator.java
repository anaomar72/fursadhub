package com.fursadhub.verification.infrastructure;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Generates the human-enterable 6-digit code for {@code VerificationChallenge} (CLAUDE.md section
 * 29 — QR/OTP account binding). Hashing reuses {@code identity.infrastructure.OpaqueTokenGenerator}
 * since SHA-256 hashing is generic, not identity-specific.
 */
@Component
public class ChallengeCodeGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String generate() {
        int value = SECURE_RANDOM.nextInt(1_000_000);
        return String.format("%06d", value);
    }
}
