package com.fursadhub.identity.domain;

import com.fursadhub.common.api.ApiException;
import org.springframework.http.HttpStatus;

/**
 * How a managed staff member's human-readable name is normalised and validated (Backend Phase B5).
 *
 * <p>Lives beside {@link PasswordPolicy} because it is the same kind of thing: one identity rule
 * that more than one request DTO and service must apply identically.
 *
 * <p><strong>This is presentation identity, never an identifier.</strong> A display name is not
 * unique, is not a login credential, and is never used to look an account up. Email remains the
 * account/auth field, and a future username phase — deliberately not started here — will introduce
 * its own login identifier separately.
 *
 * <p><strong>What normalisation does NOT do.</strong> It does not parse first and last names, does
 * not title-case, does not transliterate, does not derive anything from the email address, and does
 * not invent a placeholder such as "Staff User" or the person's role. A name FursadHub made up is
 * worse than no name: the admin can see the email and knows who they created, whereas a fabricated
 * name is silently wrong and looks authoritative. An omitted name stays null.
 */
public final class DisplayNamePolicy {

    /** Matches {@code users.display_name VARCHAR(255)} in V45. */
    public static final int MAX_LENGTH = 255;

    private DisplayNamePolicy() {
    }

    /**
     * Trims, collapses internal runs of spaces, and returns null for anything blank — the same
     * shape as {@code ProfileText.normalize}, so a name and an institution's profile text cannot
     * normalise differently.
     *
     * <p><strong>Deliberately Unicode-friendly.</strong> No character allowlist: Somali, Arabic and
     * every other script are legitimate here, as are spaces, hyphens and apostrophes
     * ("Cabdi-Raxmaan", "O'Neill", "Ahmed Cali Xasan"). Restricting names to ASCII letters is a
     * classic way to tell a large part of the world their name is invalid, and FursadHub's first
     * market is Somalia.
     *
     * <p>What IS rejected: control characters, including line breaks and tabs. Those are not part of
     * any name, they cannot render in a one-line label, and collapsing them silently would accept
     * a value nobody typed on purpose.
     *
     * @return the normalised name, or null when nothing usable was supplied
     */
    public static String normalize(String value) {
        if (value == null) {
            return null;
        }
        if (containsControlCharacter(value)) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A display name must not contain line breaks or control characters.");
        }

        // [\s\p{Z}] rather than \s alone: \s misses the Unicode space separators, and NON-BREAKING
        // SPACE (U+00A0) in particular is not whitespace to String.strip(). Without \p{Z} a name
        // consisting only of a non-breaking space would survive as a one-character "name" that
        // renders as an empty label — visibly blank, but not null.
        String collapsed = value.replaceAll("[\\s\\p{Z}]+", " ").trim();
        if (collapsed.isEmpty()) {
            return null;
        }
        if (collapsed.length() > MAX_LENGTH) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A display name must be at most " + MAX_LENGTH + " characters.");
        }
        return collapsed;
    }

    /**
     * Unwraps a display-name command field, requiring the property to have actually been SENT.
     *
     * <p>Shared by the organization and university commands so the two cannot diverge on the one
     * question that matters here: an omitted property is a malformed command, not an instruction to
     * erase. {@code {}} is rejected; {@code {"displayName": null}} is an explicit clear and returns
     * null.
     *
     * @return the submitted value, which may legitimately be null (clear)
     */
    public static String requireSubmitted(com.fursadhub.common.api.PatchField<String> displayName) {
        com.fursadhub.common.api.PatchField<String> submitted =
                com.fursadhub.common.api.PatchField.orAbsent(displayName);
        if (!submitted.isPresent()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A displayName property is required. Send null to clear the display name.");
        }
        return submitted.value();
    }

    /**
     * Any Unicode control character. Checked on the RAW value before trimming, so a name is rejected
     * for containing a line break rather than quietly having it flattened into a space.
     */
    private static boolean containsControlCharacter(String value) {
        return value.codePoints().anyMatch(codePoint -> Character.getType(codePoint) == Character.CONTROL);
    }
}
