package com.fursadhub.identity.infrastructure;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/** Cryptographically secure 4-digit (0000-9999) email-verification code generator (CLAUDE.md section 13). */
@Component
public class EmailVerificationCodeGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String generate() {
        return format(SECURE_RANDOM.nextInt(10_000));
    }

    /** Package-visible so leading-zero formatting can be unit-tested without depending on randomness. */
    static String format(int value) {
        return String.format("%04d", value);
    }
}
