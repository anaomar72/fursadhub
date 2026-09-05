package com.fursadhub.identity.domain;

import com.fursadhub.common.api.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Locale;

/**
 * The login identifier for a manually provisioned institution-managed staff account
 * (Backend Phase B5.5).
 *
 * <p>Sits beside {@link PasswordPolicy} and {@link DisplayNamePolicy} — the same place every other
 * identity rule that more than one DTO and service must apply identically already lives.
 *
 * <p><strong>Three separate concepts, deliberately not merged.</strong> {@code username} is what a
 * managed staff member types to log in; {@link DisplayNamePolicy} is who they are to a human; and
 * {@code email} remains their contact and password-recovery address. Nothing derives one from
 * another — no username is built from a display name or an email local part, because a credential
 * FursadHub invented is one the person never chose and cannot predict.
 *
 * <p><strong>Deliberately ASCII, unlike a display name.</strong> B5 argued hard for Unicode names,
 * and that was right: a name belongs to a person. A credential is different. It must be typable on
 * any keyboard, reproducible from memory, and immune to confusable characters — Cyrillic "а" and
 * Latin "a" are indistinguishable on screen, and allowing both would make one staff member's login
 * impersonatable by another. Human identity is served by {@code display_name}; this is a key.
 *
 * <p><strong>{@code @} is forbidden</strong>, which is what keeps the login screen deterministic: an
 * identifier containing {@code @} is an email address and nothing else, so a single input field can
 * route to the right lookup without guessing.
 */
public final class UsernamePolicy {

    public static final int MIN_LENGTH = 3;

    /** Matches {@code users.username VARCHAR(64)} in V46. */
    public static final int MAX_LENGTH = 64;

    /**
     * Lowercase alphanumeric at each end, with dots, underscores and hyphens permitted only
     * BETWEEN alphanumerics and never doubled.
     *
     * <p>Reads as: one alphanumeric, then any number of (single punctuation followed by an
     * alphanumeric run). That single expression enforces "starts alphanumeric", "ends alphanumeric"
     * and "no consecutive punctuation" together, which is why they cannot drift apart.
     *
     * <p>Applied to the ALREADY-lowercased candidate, so it doubles as the guarantee that only
     * canonical form is ever persisted — and it is mirrored by a CHECK constraint in V46.
     */
    public static final String CANONICAL_REGEX = "^[a-z0-9]+([._-][a-z0-9]+)*$";

    private UsernamePolicy() {
    }

    /**
     * Lower-cases and validates a submitted username, returning the canonical form to persist and
     * to look up by.
     *
     * <p>Case folding is the ONLY transformation. {@code Ahmed.Hassan} becomes {@code ahmed.hassan},
     * but punctuation is never inserted, removed or rewritten: if the admin typed something invalid
     * they are told, rather than quietly given a different account name than the one they chose.
     *
     * <p>{@link Locale#ROOT} avoids the Turkish dotless-i problem — on a Turkish default locale
     * {@code "I".toLowerCase()} yields {@code "ı"}, which would canonicalise the same input to two
     * different login identifiers depending on server locale.
     *
     * @throws ApiException {@code VALIDATION_FAILED} for anything absent or malformed
     */
    public static String canonicalize(String rawUsername) {
        if (rawUsername == null || rawUsername.isBlank()) {
            throw invalid("A username is required.");
        }

        String candidate = rawUsername.strip().toLowerCase(Locale.ROOT);
        if (candidate.length() < MIN_LENGTH || candidate.length() > MAX_LENGTH) {
            throw invalid("A username must be between " + MIN_LENGTH + " and " + MAX_LENGTH + " characters.");
        }
        if (!candidate.matches(CANONICAL_REGEX)) {
            throw invalid("A username may use only letters, digits, dots, underscores and hyphens, "
                    + "must start and end with a letter or digit, and must not repeat punctuation.");
        }
        return candidate;
    }

    private static ApiException invalid(String message) {
        return new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, message);
    }
}
