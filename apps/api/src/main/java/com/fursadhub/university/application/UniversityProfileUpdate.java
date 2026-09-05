package com.fursadhub.university.application;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.university.domain.UniversityProfileFields;

/**
 * What a {@code UNIVERSITY_ADMIN} asked to change about their profile, as opposed to
 * {@link UniversityProfileFields}, which is what the profile will BE once the request is resolved
 * against what is stored. The organization module's {@code OrganizationProfileUpdate} carries the
 * full rationale; this is the same split with the university's smaller field set.
 *
 * <p>The five original fields are plain — full replacement, where null clears. Only the two fields
 * Backend Phase B2 added are presence-aware.
 */
public record UniversityProfileUpdate(
        // Full replacement, pre-B2 semantics.
        String name,
        String city,
        String registrationNumber,
        String website,
        String description,

        // Presence-aware, added by B2.
        PatchField<String> countryCode,
        PatchField<String> publicContactEmail) {

    /** A raw null wrapper means the field was never set, which is ABSENT — the reading that preserves data. */
    public UniversityProfileUpdate {
        countryCode = PatchField.orAbsent(countryCode);
        publicContactEmail = PatchField.orAbsent(publicContactEmail);
    }
}
