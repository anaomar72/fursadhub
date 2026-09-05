package com.fursadhub.opportunity.domain;

import com.fursadhub.common.api.ApiException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Normalisation shared by the opportunity's two authored value lists — skills and perks
 * (Backend Phase B3).
 *
 * <p>One implementation on purpose. Skills and perks have identical hygiene rules, and two copies
 * would drift the first time one of them gained a rule the other did not: a duplicate that survives
 * in perks but not in skills is the kind of inconsistency nobody notices until a listing renders
 * "Mentorship, mentorship".
 *
 * <p>What "normalised" means here:
 *
 * <ul>
 *   <li>surrounding whitespace trimmed, internal runs collapsed to single spaces — so
 *       {@code "Data  Analysis"} and {@code "Data Analysis"} are one skill, not two
 *   <li>blank entries dropped rather than rejected: an empty row in a form is the author leaving a
 *       slot untouched, not an error worth failing the whole save for
 *   <li>duplicates removed case-insensitively, keeping the FIRST spelling the author used, so
 *       {@code ["Java", "java"]} stores {@code "Java"}
 *   <li>order preserved exactly as submitted — the author's ordering is meaningful (most important
 *       skill first) and is what {@code position} persists
 * </ul>
 *
 * <p>This is opportunity-authored metadata, deliberately NOT a global taxonomy. See
 * {@code OpportunitySkill} for the migration path if a controlled vocabulary is ever needed.
 */
final class OpportunityTagList {

    private OpportunityTagList() {
    }

    /**
     * @param values    raw submitted values; null is treated as an empty list
     * @param maxCount  hard cap on the number of entries
     * @param maxLength hard cap on one entry's length, checked AFTER trimming
     * @param label     what to call these in an error message ("skills"/"perks")
     * @return the cleaned, deduplicated, order-preserving list
     */
    static List<String> normalize(List<String> values, int maxCount, int maxLength, String label) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        // Keyed by the case-folded form so duplicates collapse; values keep the original spelling.
        Map<String, String> unique = new LinkedHashMap<>();
        for (String raw : values) {
            if (raw == null) {
                continue;
            }
            String collapsed = raw.strip().replaceAll("\\s+", " ");
            if (collapsed.isEmpty()) {
                continue;
            }
            if (collapsed.length() > maxLength) {
                throw invalid("Each of the " + label + " must be at most " + maxLength + " characters.");
            }
            unique.putIfAbsent(collapsed.toLowerCase(Locale.ROOT), collapsed);
        }

        if (unique.size() > maxCount) {
            throw invalid("An opportunity supports at most " + maxCount + " " + label + ".");
        }
        return new ArrayList<>(unique.values());
    }

    /** The case-folded form stored alongside the original, so the database can enforce uniqueness. */
    static String normalizedKey(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static ApiException invalid(String message) {
        return new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, message);
    }
}
