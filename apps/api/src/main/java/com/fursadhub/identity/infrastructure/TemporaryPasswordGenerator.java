package com.fursadhub.identity.infrastructure;

import com.fursadhub.identity.domain.PasswordPolicy;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Generates a fresh temporary password for a server-driven credential reset (CLAUDE.md section
 * 26A "Staff Password Reset") — the one remaining server-generated-password path once account
 * creation moved to an admin-supplied password.
 *
 * <p>Not {@link OpaqueTokenGenerator}: its Base64 URL-safe alphabet only *probably* contains a
 * digit, and a temporary password that occasionally failed {@link PasswordPolicy#REGEX} would be
 * a correctness bug. This generator places one letter and one digit deterministically, then
 * shuffles, so every result is guaranteed to satisfy the policy.
 */
@Component
public class TemporaryPasswordGenerator {

    private static final String LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String ALPHABET = LETTERS + DIGITS;
    private static final int LENGTH = 16;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String generate() {
        char[] chars = new char[LENGTH];
        chars[0] = LETTERS.charAt(SECURE_RANDOM.nextInt(LETTERS.length()));
        chars[1] = DIGITS.charAt(SECURE_RANDOM.nextInt(DIGITS.length()));
        for (int i = 2; i < LENGTH; i++) {
            chars[i] = ALPHABET.charAt(SECURE_RANDOM.nextInt(ALPHABET.length()));
        }
        for (int i = chars.length - 1; i > 0; i--) {
            int j = SECURE_RANDOM.nextInt(i + 1);
            char swap = chars[i];
            chars[i] = chars[j];
            chars[j] = swap;
        }
        return new String(chars);
    }
}
