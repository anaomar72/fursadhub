package com.fursadhub.common.api;

import com.fursadhub.common.api.ApiError.FieldError;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * The allowlist is the only thing standing between an anonymous caller and a raw JPA property name,
 * so its contract is worth pinning directly rather than only through the endpoints that use it.
 */
class SortAllowlistTest {

    private final SortAllowlist allowlist = SortAllowlist.forParameter("sort")
            .allow("name", Sort.by(Sort.Direction.ASC, "name"))
            .allow("nameDesc", Sort.by(Sort.Direction.DESC, "name"))
            .build();

    @Test
    void resolvesAnAllowedKey() {
        assertThat(allowlist.resolve("nameDesc")).isEqualTo(Sort.by(Sort.Direction.DESC, "name"));
    }

    @Test
    void fallsBackToTheFirstDeclaredKeyWhenNoneIsSupplied() {
        Sort expected = Sort.by(Sort.Direction.ASC, "name");

        assertThat(allowlist.resolve(null)).isEqualTo(expected);
        assertThat(allowlist.resolve("")).isEqualTo(expected);
        assertThat(allowlist.resolve("   ")).isEqualTo(expected);
    }

    @Test
    void trimsSurroundingWhitespaceBeforeMatching() {
        assertThat(allowlist.resolve("  nameDesc  ")).isEqualTo(Sort.by(Sort.Direction.DESC, "name"));
    }

    /**
     * The security property: a property name the endpoint never declared must not reach Spring Data,
     * and must not be silently swapped for the default either — a caller who asked for an ordering
     * and quietly got a different one has been misled.
     */
    @Test
    void rejectsAnythingNotOnTheList() {
        assertThatThrownBy(() -> allowlist.resolve("registrationNumber"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> allowlist.resolve("name,asc"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> allowlist.resolve("NAME"))
                .as("matching is exact, not case-insensitive")
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rejectionUsesTheStandardValidationContract() {
        ApiException thrown = catchThrowableOfType(
                () -> allowlist.resolve("verificationStatus"), ApiException.class);

        assertThat(thrown.getCode()).isEqualTo("VALIDATION_FAILED");
        assertThat(thrown.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(thrown.getFieldErrors()).singleElement()
                .extracting(FieldError::field, FieldError::code)
                .containsExactly("sort", "INVALID");
    }

    /**
     * The rejection message names the permitted keys but must never echo the rejected value back —
     * that would reflect caller-supplied text into a response body for no benefit.
     */
    @Test
    void rejectionMessageListsAllowedKeysWithoutEchoingTheRejectedValue() {
        ApiException thrown = catchThrowableOfType(
                () -> allowlist.resolve("registrationNumber"), ApiException.class);

        String message = thrown.getFieldErrors().get(0).message();
        assertThat(message).contains("name", "nameDesc");
        assertThat(message).doesNotContain("registrationNumber");
    }

    @Test
    void aBuilderWithNoAllowedSortsIsRejected() {
        assertThatThrownBy(() -> SortAllowlist.forParameter("sort").build())
                .isInstanceOf(IllegalStateException.class);
    }
}
