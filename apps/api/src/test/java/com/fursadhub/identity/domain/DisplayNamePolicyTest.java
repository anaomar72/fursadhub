package com.fursadhub.identity.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * How a managed staff member's display name is normalised (Backend Phase B5).
 *
 * <p>The most important cases here are the ones about what is ACCEPTED: FursadHub's first market is
 * Somalia, and a name policy that quietly rejects non-Latin scripts tells a large part of the world
 * their name is invalid.
 */
class DisplayNamePolicyTest {

    // ---------------------------------------------------------------- accepted

    @ParameterizedTest
    @ValueSource(strings = {
            "Ahmed Hassan",
            // Apostrophes and hyphens are ordinary parts of names.
            "O'Neill",
            "Cabdi-Raxmaan",
            "Ahmed Cali Xasan",
            // Non-Latin scripts must work. No ASCII allowlist.
            "أحمد حسن",
            "Zoë Müller",
            "Björk Guðmundsdóttir",
            "李伟",
            // A single character is a legitimate name in some contexts.
            "A"})
    void legitimateNamesAreAccepted(String name) {
        assertThat(DisplayNamePolicy.normalize(name)).as("%s must be accepted", name).isEqualTo(name);
    }

    // ---------------------------------------------------------------- normalisation

    @Test
    void surroundingWhitespaceIsTrimmed() {
        assertThat(DisplayNamePolicy.normalize("  Ahmed Hassan  ")).isEqualTo("Ahmed Hassan");
    }

    @Test
    void repeatedInternalSpacesCollapse() {
        assertThat(DisplayNamePolicy.normalize("Ahmed    Hassan")).isEqualTo("Ahmed Hassan");
    }

    /** Blank means "no name" — null, never an empty or blank-looking label. U+00A0 included. */
    @ParameterizedTest
    @ValueSource(strings = {"", "   ", " "})
    void blankBecomesNull(String blank) {
        assertThat(DisplayNamePolicy.normalize(blank)).isNull();
    }

    @Test
    void nullStaysNull() {
        assertThat(DisplayNamePolicy.normalize(null)).isNull();
    }

    /** No title-casing, no reordering, no transliteration — the admin's input is stored as given. */
    @Test
    void casingAndOrderAreLeftExactlyAsSupplied() {
        assertThat(DisplayNamePolicy.normalize("ahmed hassan")).isEqualTo("ahmed hassan");
        assertThat(DisplayNamePolicy.normalize("HASSAN, Ahmed")).isEqualTo("HASSAN, Ahmed");
    }

    // ---------------------------------------------------------------- rejected

    /**
     * Line breaks and control characters are rejected rather than flattened: they cannot render in a
     * one-line label, and silently collapsing them would accept a value nobody typed on purpose.
     */
    @ParameterizedTest
    @ValueSource(strings = {
            "Ahmed\nHassan",
            "Ahmed\r\nHassan",
            "Ahmed\tHassan",
            "Ahmed\0Hassan",
            "Ahmed\007Hassan"})
    void controlCharactersAndLineBreaksAreRejected(String name) {
        assertThatThrownBy(() -> DisplayNamePolicy.normalize(name))
                .as("%s must be rejected", name.replaceAll("\\p{Cntrl}", "?"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void anOverLongNameIsRejected() {
        String tooLong = "x".repeat(DisplayNamePolicy.MAX_LENGTH + 1);

        assertThatThrownBy(() -> DisplayNamePolicy.normalize(tooLong)).isInstanceOf(ApiException.class);
    }

    @Test
    void aNameAtExactlyTheLimitIsAccepted() {
        String exact = "x".repeat(DisplayNamePolicy.MAX_LENGTH);

        assertThat(DisplayNamePolicy.normalize(exact)).isEqualTo(exact);
    }

    /** Length is measured after trimming, so padding cannot push a legal name over the limit. */
    @Test
    void lengthIsMeasuredAfterTrimming() {
        String exact = "x".repeat(DisplayNamePolicy.MAX_LENGTH);

        assertThat(DisplayNamePolicy.normalize("  " + exact + "  ")).isEqualTo(exact);
    }
}
