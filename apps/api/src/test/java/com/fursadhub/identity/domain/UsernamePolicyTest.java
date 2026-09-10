package com.fursadhub.identity.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The managed-account login identifier's syntax and canonicalisation (Backend Phase B5.5). */
class UsernamePolicyTest {

    // ---------------------------------------------------------------- accepted

    @ParameterizedTest
    @ValueSource(strings = {
            "ahmed",
            "ahmed.hassan",
            "ahmed_hassan",
            "ahmed-hassan",
            "ahmed123",
            "a1b",
            // Punctuation is fine repeatedly, as long as it never doubles and never sits at an end.
            "a.b_c-d",
            "recruiter.jamhuriya"})
    void validUsernamesAreAccepted(String username) {
        assertThat(UsernamePolicy.canonicalize(username)).as("%s must be accepted", username).isEqualTo(username);
    }

    @Test
    void maximumLengthIsAccepted() {
        String longest = "a".repeat(UsernamePolicy.MAX_LENGTH);

        assertThat(UsernamePolicy.canonicalize(longest)).isEqualTo(longest);
    }

    // ---------------------------------------------------------------- canonicalisation

    /** Case is the ONLY thing normalisation changes. */
    @ParameterizedTest
    @ValueSource(strings = {"Ahmed", "AHMED", "aHmEd"})
    void caseVariantsCanonicaliseToOneIdentity(String variant) {
        assertThat(UsernamePolicy.canonicalize(variant)).isEqualTo("ahmed");
    }

    @Test
    void mixedCaseWithPunctuationCanonicalises() {
        assertThat(UsernamePolicy.canonicalize("Ahmed.Hassan")).isEqualTo("ahmed.hassan");
    }

    @Test
    void surroundingWhitespaceIsStrippedBeforeValidation() {
        assertThat(UsernamePolicy.canonicalize("  ahmed  ")).isEqualTo("ahmed");
    }

    /** Punctuation is never inserted, removed or rewritten — only the case changes. */
    @Test
    void punctuationIsNeverAltered() {
        assertThat(UsernamePolicy.canonicalize("A_b-C.d")).isEqualTo("a_b-c.d");
    }

    // ---------------------------------------------------------------- rejected

    @ParameterizedTest
    @ValueSource(strings = {
            // Too short.
            "ab",
            "a",
            // Leading punctuation.
            "-ahmed",
            ".ahmed",
            "_ahmed",
            // Trailing punctuation.
            "ahmed-",
            "ahmed.",
            "ahmed_",
            // Consecutive punctuation.
            "ahmed..hassan",
            "ahmed_-hassan",
            "ahmed--hassan",
            // Whitespace of any kind.
            "ahmed hassan",
            "ahmed\thassan",
            "ahmed\nhassan",
            // '@' is forbidden, which is what keeps a single login field deterministic.
            "ahmed@company",
            "ahmed@example.com",
            // Other punctuation is not in the allowlist.
            "ahmed+hassan",
            "ahmed/hassan",
            "ahmed!",
            // Non-ASCII: a credential must be typable and free of confusable characters.
            "أحمد",
            "ahmеd"})
    void invalidUsernamesAreRejected(String username) {
        assertThatThrownBy(() -> UsernamePolicy.canonicalize(username))
                .as("%s must be rejected", username.replaceAll("\\s", "?"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void anOverLongUsernameIsRejected() {
        assertThatThrownBy(() -> UsernamePolicy.canonicalize("a".repeat(UsernamePolicy.MAX_LENGTH + 1)))
                .isInstanceOf(ApiException.class);
    }

    /** There is no clear operation for a username, so absent and blank are simply invalid. */
    @Test
    void nullAndBlankAreRejected() {
        assertThatThrownBy(() -> UsernamePolicy.canonicalize(null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> UsernamePolicy.canonicalize("")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> UsernamePolicy.canonicalize("   ")).isInstanceOf(ApiException.class);
    }

    /**
     * A username that would only become valid by rewriting its punctuation is rejected rather than
     * silently repaired — the admin gets the account name they typed, or an error.
     */
    @Test
    void anInvalidUsernameIsNeverRepairedIntoAValidOne() {
        assertThatThrownBy(() -> UsernamePolicy.canonicalize("ahmed..hassan")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> UsernamePolicy.canonicalize("ahmed hassan")).isInstanceOf(ApiException.class);
    }
}
