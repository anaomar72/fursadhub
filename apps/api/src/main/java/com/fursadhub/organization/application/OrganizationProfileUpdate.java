package com.fursadhub.organization.application;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.organization.domain.CompanySizeRange;
import com.fursadhub.organization.domain.OrganizationProfileFields;

/**
 * What an {@code ORGANIZATION_ADMIN} asked to change about their profile — as opposed to
 * {@link OrganizationProfileFields}, which is what the profile will BE once the request is resolved
 * against what is stored.
 *
 * <p>The two types are deliberately different shapes. The domain record holds plain values and is
 * assigned wholesale, so the entity keeps one simple, auditable meaning: these are the fields, this
 * is their state. This record is the request as it arrived, still carrying the distinction between
 * "the client omitted this" and "the client cleared this" for the fields Backend Phase B2 added.
 * {@code UpdateOrganizationService} resolves one into the other, which is the only place both the
 * request and the stored entity are in scope.
 *
 * <p>The four original fields are plain because their semantics are unchanged: full replacement,
 * where null clears. Only the B2 additions are presence-aware. See {@code UpdateOrganizationRequest}
 * for why the endpoint carries both.
 */
public record OrganizationProfileUpdate(
        // Full replacement, pre-B2 semantics.
        String name,
        String registrationNumber,
        String website,
        String description,

        // Presence-aware, added by B2.
        PatchField<String> industry,
        PatchField<String> city,
        PatchField<String> countryCode,
        PatchField<String> shortDescription,
        PatchField<CompanySizeRange> companySizeRange,
        PatchField<Integer> foundedYear,
        PatchField<String> linkedinUrl,
        PatchField<String> xUrl,
        PatchField<String> instagramUrl,
        PatchField<String> youtubeUrl) {

    /**
     * Normalises every presence-aware component to a non-null {@link PatchField}, so nothing
     * downstream has to null-check a wrapper. A raw null means the field was never set, which is
     * ABSENT — the reading that preserves data.
     */
    public OrganizationProfileUpdate {
        industry = PatchField.orAbsent(industry);
        city = PatchField.orAbsent(city);
        countryCode = PatchField.orAbsent(countryCode);
        shortDescription = PatchField.orAbsent(shortDescription);
        companySizeRange = PatchField.orAbsent(companySizeRange);
        foundedYear = PatchField.orAbsent(foundedYear);
        linkedinUrl = PatchField.orAbsent(linkedinUrl);
        xUrl = PatchField.orAbsent(xUrl);
        instagramUrl = PatchField.orAbsent(instagramUrl);
        youtubeUrl = PatchField.orAbsent(youtubeUrl);
    }
}
