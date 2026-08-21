package com.fursadhub.identity.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Keyed-hash (HMAC-SHA256) representation of a 4-digit email-verification code (CLAUDE.md
 * section 13). A plain hash would be trivially brute-forceable offline — a 4-digit code has only
 * 10,000 possible values — if this table ever leaked, so the hash is keyed with a server-side
 * secret. The hash is additionally scoped per-user (the user id is mixed into the HMAC input) so
 * two users who happen to receive the same code never produce the same stored hash.
 */
@Component
public class EmailVerificationCodeHasher {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationCodeHasher.class);
    private static final String ALGORITHM = "HmacSHA256";

    private final SecretKeySpec key;

    public EmailVerificationCodeHasher(@Value("${fursadhub.auth.email-verification-code-secret:}") String configuredSecret) {
        String secret = (configuredSecret == null || configuredSecret.isBlank()) ? generateEphemeralSecret() : configuredSecret;
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM);
    }

    public String hash(UUID userId, String rawCode) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            byte[] result = mac.doFinal((userId + ":" + rawCode).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(result);
        } catch (Exception e) {
            throw new IllegalStateException(ALGORITHM + " is unavailable", e);
        }
    }

    private static String generateEphemeralSecret() {
        log.warn("No EMAIL_VERIFICATION_CODE_SECRET configured — generating an ephemeral HMAC secret. "
                + "This is only safe for local development and tests; staging/production MUST configure a real secret.");
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
}
