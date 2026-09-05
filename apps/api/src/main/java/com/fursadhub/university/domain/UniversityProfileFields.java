package com.fursadhub.university.domain;

/**
 * Everything a {@code UNIVERSITY_ADMIN} may edit about their university's profile
 * (Backend Phase B2), mirroring {@code OrganizationProfileFields}.
 *
 * <p><strong>This is the RESOLVED profile, not the request</strong> — a null field clears the stored
 * value. What an omitted REQUEST field means is decided in {@code UpdateUniversityService}: the five
 * pre-B2 fields keep the long-standing full-replacement behaviour, while the two fields B2 added are
 * resolved against what is stored. See {@code UniversityProfileUpdate}.
 *
 * <p>Deliberately smaller than the organization's set. {@code city}, {@code website} and
 * {@code description} already existed (V9, V38) and are reused unchanged; B2 adds only
 * {@code countryCode} and {@code publicContactEmail}. Industry, company size and founded year are
 * organization concepts and are not mirrored here.
 *
 * @param publicContactEmail an address the UNIVERSITY chooses to publish — {@code careers@},
 *                           {@code internships@}. It is set explicitly through this request and is
 *                           never defaulted, copied or derived from any {@code users.email}: a staff
 *                           member's login address must not become public profile content.
 */
public record UniversityProfileFields(
        String name,
        String city,
        String countryCode,
        String registrationNumber,
        String website,
        String description,
        String publicContactEmail) {
}
