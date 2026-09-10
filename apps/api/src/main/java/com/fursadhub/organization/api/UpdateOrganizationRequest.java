package com.fursadhub.organization.api;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.common.api.PublicLink;
import com.fursadhub.common.api.PublicLinkPolicy;
import com.fursadhub.organization.domain.CompanySizeRange;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The organization's editable profile. Backend Phase B2 widened this additively — every new field is
 * optional, so a client sending only the original four continues to work.
 *
 * <p><strong>Two semantics in one request, on purpose.</strong>
 *
 * <ul>
 *   <li>The four ORIGINAL fields — {@code name}, {@code registrationNumber}, {@code website},
 *       {@code description} — keep FULL REPLACEMENT, unchanged since before B2: {@code name} is
 *       required, the others are nullable, and omitting one CLEARS it. Callers written against that
 *       contract may rely on it, so B2 does not touch it.
 *   <li>Every field B2 ADDED is a {@link PatchField}, which distinguishes omitted from explicitly
 *       null. Omitting one PRESERVES the stored value; sending {@code null} clears it.
 * </ul>
 *
 * <p>The split is what makes "existing clients omitting new fields must continue to work" true
 * semantically and not merely at compile time. The pre-B2 management form does not know these
 * fields exist and therefore cannot send them; under plain full-replacement its every save would
 * silently erase an admin's industry, location, size, founding year and social links. See
 * {@code PatchField} for the mechanism.
 *
 * <p>Every constraint below still applies to the value inside the wrapper. Null is valid throughout,
 * which is what makes each new field optional while still validating anything actually supplied.
 * Blank-but-present strings are normalised to null in {@code UpdateOrganizationService} rather than
 * stored as empty strings.
 */
public record UpdateOrganizationRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 120) String registrationNumber,

        // Existing field, now fully URL-validated. Previously accepted any string up to 255; a
        // stored value that predates this rule is never rewritten, but a profile SAVE must now
        // supply a well-formed link — see the B2 report's note on pre-existing malformed websites.
        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink String website,

        @Size(max = 2000) String description,

        // ---------------------------------------------------------------- Backend Phase B2
        // Presence-aware from here down. Omitted => preserved; explicit null => cleared.
        @Size(max = 120) PatchField<String> industry,
        @Size(max = 120) PatchField<String> city,

        /** ISO-3166-1 alpha-2. Accepted in either case and upper-cased by the service. */
        @Pattern(regexp = "^(?i)[a-z]{2}$", message = "Country must be a two-letter ISO country code.")
        PatchField<String> countryCode,

        @Size(max = 200) PatchField<String> shortDescription,

        /** An unknown value is rejected by Jackson's enum binding as VALIDATION_FAILED. */
        PatchField<CompanySizeRange> companySizeRange,

        /**
         * Lower bound only here; "not in the future" needs the injected {@link java.time.Clock} and
         * is enforced in {@code UpdateOrganizationService} so it stays deterministically testable.
         */
        @Min(value = 1800, message = "Founded year must be 1800 or later.")
        @Max(value = 2200, message = "Founded year is not valid.")
        PatchField<Integer> foundedYear,

        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink PatchField<String> linkedinUrl,

        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink PatchField<String> xUrl,

        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink PatchField<String> instagramUrl,

        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink PatchField<String> youtubeUrl) {
}
