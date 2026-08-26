package com.fursadhub.file.infrastructure.storage;

import com.fursadhub.file.domain.FileClassification;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Produces the random storage keys required by CLAUDE.md section 47.
 *
 * <p>The key carries 256 bits of {@link SecureRandom} entropy and NOTHING derived from the document,
 * the student, the placement or the file id. That matters twice over: the key cannot be guessed from
 * anything an attacker might already know, and the key itself leaks nothing about whose report it is
 * to anyone who can list the bucket.
 *
 * <p>The classification prefix is purely operational grouping and is not secret.
 */
public final class StorageKeyGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int ENTROPY_BYTES = 32;

    private StorageKeyGenerator() {
    }

    public static String generate(FileClassification classification) {
        byte[] bytes = new byte[ENTROPY_BYTES];
        RANDOM.nextBytes(bytes);
        String random = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return classification.name().toLowerCase() + "/" + random;
    }
}
