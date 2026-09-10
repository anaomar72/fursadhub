package com.fursadhub.university.api;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.common.api.PublicLink;
import com.fursadhub.common.api.PublicLinkPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The university's editable profile. Backend Phase B2 widened this additively — both new fields are
 * optional, so a client sending only the original five continues to work.
 *
 * <p><strong>Two semantics in one request</strong>, matching
 * {@code UpdateOrganizationRequest}: the five ORIGINAL fields keep FULL REPLACEMENT — {@code name}
 * required, the others nullable, and omitting one CLEARS it — while the two fields B2 ADDED are
 * {@link PatchField}s, where omitting PRESERVES the stored value and only an explicit null clears
 * it. That is what stops the pre-B2 management form, which cannot send fields it does not know
 * about, from erasing them on every save.
 *
 * <p>Smaller than the organization's request on purpose: {@code city}, {@code website} and
 * {@code description} already existed and are reused; industry, company size and founded year are
 * organization concepts and are not mirrored onto a university.
 */
public record UpdateUniversityRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 120) String city,

        // ---------------------------------------------------------------- Backend Phase B2
        /** ISO-3166-1 alpha-2. Accepted in either case and upper-cased by the service. */
        @Pattern(regexp = "^(?i)[a-z]{2}$", message = "Country must be a two-letter ISO country code.")
        PatchField<String> countryCode,

        @Size(max = 120) String registrationNumber,

        // Existing field, now fully URL-validated — see UpdateOrganizationRequest for the note on
        // values stored before this rule existed.
        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink String website,

        @Size(max = 2000) String description,

        /**
         * A public, institution-managed address such as {@code careers@} — never a staff member's
         * login address. It exists only because it is set explicitly here; nothing derives it from
         * {@code users.email}. Added by B2, so it is presence-aware.
         */
        @Email @Size(max = 320) PatchField<String> publicContactEmail) {
}
