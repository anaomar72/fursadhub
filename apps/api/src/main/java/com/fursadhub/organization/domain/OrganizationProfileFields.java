package com.fursadhub.organization.domain;

/**
 * Everything an {@code ORGANIZATION_ADMIN} may edit about their organization's profile
 * (Backend Phase B2).
 *
 * <p>A value record rather than a longer parameter list. Backend Phase B2 takes the editable set
 * from four fields to thirteen, and thirteen positional parameters — eleven of them {@code String} —
 * is a transposition bug waiting to happen: swapping {@code city} and {@code industry} at one call
 * site would compile cleanly and corrupt every profile saved through it.
 *
 * <p><strong>This is the RESOLVED profile, not the request.</strong> Every field here is assigned on
 * save, so a null clears the stored value. What an omitted REQUEST field means is a separate
 * question, answered in {@code UpdateOrganizationService}: the four pre-B2 fields keep this
 * endpoint's long-standing full-replacement behaviour, where omitting clears, while the fields B2
 * added are resolved against what is stored so a client that predates them cannot erase them. See
 * {@code OrganizationProfileUpdate} for the request-side shape.
 *
 * @param name             required; never null
 * @param registrationNumber existing field, unchanged
 * @param website          existing field, now scheme-validated
 * @param description      existing full profile body, unchanged (2000 characters)
 * @param industry         free-text sector in the organization's own words
 * @param city             structured location
 * @param countryCode      ISO-3166-1 alpha-2, uppercase
 * @param shortDescription one-line summary for directory cards
 * @param companySizeRange optional band, never an exact headcount
 * @param foundedYear      optional year; not in the future
 * @param linkedinUrl      optional public link
 * @param xUrl             optional public link
 * @param instagramUrl     optional public link
 * @param youtubeUrl       optional public link
 */
public record OrganizationProfileFields(
        String name,
        String registrationNumber,
        String website,
        String description,
        String industry,
        String city,
        String countryCode,
        String shortDescription,
        CompanySizeRange companySizeRange,
        Integer foundedYear,
        String linkedinUrl,
        String xUrl,
        String instagramUrl,
        String youtubeUrl) {
}
