package com.fursadhub.common.api;

import java.util.Locale;

/**
 * Normalisation for institution-managed profile text (Backend Phase B2), shared by the organization
 * and university profile services so the two cannot normalise differently.
 *
 * <p>The point is that {@code ""}, {@code "   "} and absent must all mean the same thing in storage.
 * Without this, an admin who clears a field in a form sends an empty string, and the profile ends up
 * holding {@code ""} — which is not null, so every {@code field != null} render check downstream
 * treats it as present and prints an empty row on the public page.
 */
public final class ProfileText {

    private ProfileText() {
    }

    /**
     * Trims, collapses runs of internal whitespace to single spaces, and returns null for anything
     * that was blank.
     *
     * <p>Internal collapsing matters for a filterable field like {@code industry}: without it,
     * {@code "Financial  Services"} and {@code "Financial Services"} are different values that
     * would never match each other in a filter.
     */
    public static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String collapsed = value.trim().replaceAll("\\s+", " ");
        return collapsed.isEmpty() ? null : collapsed;
    }

    /**
     * Normalises an ISO-3166-1 alpha-2 country code to upper case, so {@code "so"} and {@code "SO"}
     * are stored identically and a country filter matches regardless of how it was typed.
     * {@link Locale#ROOT} avoids the Turkish dotless-i problem on a server with a Turkish locale.
     */
    public static String normalizeCountryCode(String value) {
        String normalized = normalize(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }
}
