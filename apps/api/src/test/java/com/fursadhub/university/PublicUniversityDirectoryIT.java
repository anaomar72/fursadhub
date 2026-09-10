package com.fursadhub.university;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B1 — the public university directory.
 *
 * <p>Visibility policy: a university is publicly discoverable if and ONLY if its
 * {@code InstitutionVerificationStatus} is {@code VERIFIED}. Unlike organizations there is no second
 * admission rule at all — an unverified university must never appear in a public directory of
 * institutions, whatever else is true about it.
 *
 * <p>This uses the EXISTING verification state model. No second verification concept is introduced.
 */
class PublicUniversityDirectoryIT extends AbstractPhase3IT {

    private static final String DIRECTORY = "/api/v1/public/universities";

    // ---------------------------------------------------------------- access and visibility

    @Test
    void anonymousCallerMayReadTheDirectory() {
        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKeys("content", "page", "size", "totalElements", "totalPages");
    }

    @Test
    void verifiedUniversityAppears() {
        String name = uniqueName("Directory Verified University");
        UUID universityId = insertVerifiedUniversity(name);

        assertThat(idsMatching(name)).containsExactly(universityId.toString());
    }

    @Test
    void unverifiedUniversityDoesNotAppear() {
        String name = uniqueName("Directory Unverified University");
        UUID universityId = insertVerifiedUniversity(name);
        setUniversityStatus(universityId, "SUBMITTED");

        assertThat(idsMatching(name)).isEmpty();
    }

    @Test
    void pendingRejectedSuspendedAndRevokedUniversitiesNeverAppear() {
        for (String status : List.of("DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES", "REJECTED", "SUSPENDED", "REVOKED")) {
            String name = uniqueName("Directory University State " + status);
            UUID universityId = insertVerifiedUniversity(name);
            setUniversityStatus(universityId, status);

            assertThat(idsMatching(name))
                    .as("a university in %s must never be publicly discoverable", status)
                    .isEmpty();
        }
    }

    // ---------------------------------------------------------------- filtering

    @Test
    void nameSearchIsCaseInsensitiveAndMatchesAFragment() {
        String name = uniqueName("Jamhuriya Institute Of Testing");
        UUID universityId = insertVerifiedUniversity(name);

        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?query=jAmHuRiYa+iNsTiTuTe");

        assertThat(ids(response)).contains(universityId.toString());
    }

    @Test
    void nameSearchExcludesNonMatches() {
        insertVerifiedUniversity(uniqueName("Included University"));

        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?query=" + encode(uniqueName("No Such University")));

        assertThat((Number) response.getBody().get("totalElements")).isEqualTo(0);
        assertThat(ids(response)).isEmpty();
    }

    // ---------------------------------------------------------------- paging, totals, sorting

    @Test
    void paginationReportsAccurateTotalsAndPages() {
        String shared = uniqueName("University Paging Group");
        for (int index = 0; index < 3; index++) {
            insertVerifiedUniversity(shared + " " + index);
        }

        ResponseEntity<Map> firstPage = unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&size=2&page=0");
        assertThat((Number) firstPage.getBody().get("totalElements")).isEqualTo(3);
        assertThat((Number) firstPage.getBody().get("totalPages")).isEqualTo(2);
        assertThat(ids(firstPage)).hasSize(2);

        ResponseEntity<Map> secondPage = unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&size=2&page=1");
        assertThat(ids(secondPage)).hasSize(1);
        assertThat(ids(firstPage)).doesNotContainAnyElementsOf(ids(secondPage));
    }

    @Test
    void defaultSortIsNameAscending() {
        String shared = uniqueName("University Sort Group");
        insertVerifiedUniversity(shared + " Charlie");
        insertVerifiedUniversity(shared + " Alpha");
        insertVerifiedUniversity(shared + " Bravo");

        assertThat(names(unauthenticatedGet(DIRECTORY + "?query=" + encode(shared))))
                .containsExactly(shared + " Alpha", shared + " Bravo", shared + " Charlie");
    }

    @Test
    void allowedDescendingSortReversesTheOrder() {
        String shared = uniqueName("University Sort Desc Group");
        insertVerifiedUniversity(shared + " Alpha");
        insertVerifiedUniversity(shared + " Bravo");

        assertThat(names(unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&sort=nameDesc")))
                .containsExactly(shared + " Bravo", shared + " Alpha");
    }

    /**
     * Every allowed key must actually resolve to a real JPA property — an allowlist entry naming a
     * field that does not exist would 500 for the first caller who used it.
     *
     * <p>{@code insertVerifiedUniversity} leaves {@code verified_at} null (the pilot rows predate
     * the column), so the test sets it explicitly rather than asserting on an accidental ordering.
     */
    @Test
    void recentlyVerifiedSortOrdersByVerificationMomentDescending() {
        String shared = uniqueName("University Recent Group");
        UUID oldest = insertVerifiedUniversity(shared + " Oldest");
        UUID newest = insertVerifiedUniversity(shared + " Newest");
        jdbcTemplate.update("UPDATE universities SET verified_at = now() - interval '10 days' WHERE id = ?", oldest);
        jdbcTemplate.update("UPDATE universities SET verified_at = now() WHERE id = ?", newest);

        List<String> ids = ids(unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&sort=recentlyVerified"));

        assertThat(ids).containsExactly(newest.toString(), oldest.toString());
    }

    @Test
    void privatePropertyNamesAreRejectedAsSortKeys() {
        for (String attempt : List.of("registrationNumber", "status", "registrationNumber,asc", "id")) {
            ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?sort=" + encode(attempt));

            assertThat(response.getStatusCode())
                    .as("sort=%s must be rejected", attempt)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
        }
    }

    @Test
    void pageSizeIsCappedAtFifty() {
        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?size=5000");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((Number) response.getBody().get("size")).isEqualTo(50);
    }

    @Test
    void outOfRangePagingValuesAreClampedRatherThanFailing() {
        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?size=0&page=-3");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((Number) response.getBody().get("size")).isEqualTo(1);
        assertThat((Number) response.getBody().get("page")).isEqualTo(0);
    }

    // ---------------------------------------------------------------- payload

    @Test
    void directoryRowNeverExposesPrivateFields() {
        String name = uniqueName("University Field Allowlist");
        UUID universityId = insertVerifiedUniversity(name);
        // Every optional field is populated so this asserts the MAXIMAL serialized surface. The API
        // is configured with default-property-inclusion: non_null, so leaving them null would omit
        // them from the JSON and the allowlist below would pass without ever having checked them.
        jdbcTemplate.update("""
                UPDATE universities
                   SET registration_number = 'SECRET-UNI-9876',
                       description = 'A public description.',
                       website = 'https://example.test',
                       country_code = 'SO'
                 WHERE id = ?
                """, universityId);

        List<Map<String, Object>> matches = rows(unauthenticatedGet(DIRECTORY + "?query=" + encode(name)));
        assertThat(matches).hasSize(1);
        Map<String, Object> row = matches.get(0);

        // countryCode and hasCover are Backend Phase B2 additions — real institution-managed profile
        // data, deliberately public. publicContactEmail is deliberately NOT on a directory row.
        assertThat(row.keySet()).containsExactlyInAnyOrder(
                "id", "name", "slug", "city", "countryCode", "description", "website",
                "verified", "hasLogo", "hasCover");
        assertThat(row).doesNotContainKeys(
                "registrationNumber", "status", "verifiedAt", "evidenceStoredFileId", "evidenceUploadedAt",
                "logoStoredFileId", "logoUploadedAt", "coverStoredFileId", "coverUploadedAt",
                "publicContactEmail", "createdAt", "updatedAt", "departments", "staff",
                "students", "placements");
        assertThat(row.toString()).doesNotContain("SECRET-UNI-9876");
    }

    /**
     * Universities carry no {@code openOpportunityCount} counterpart: a university's relationship to
     * opportunities runs through nominations and placements, which are private student records.
     * Publishing a count derived from them would leak the shape of that data.
     */
    @Test
    void directoryRowCarriesNoPlacementDerivedCounts() {
        String name = uniqueName("University No Counts");
        insertVerifiedUniversity(name);

        Map<String, Object> row = rows(unauthenticatedGet(DIRECTORY + "?query=" + encode(name))).get(0);

        assertThat(row).doesNotContainKeys(
                "openOpportunityCount", "studentCount", "placementCount", "partnerOrganizations", "supervisors");
    }

    // ---------------------------------------------------------------- helpers

    private List<String> idsMatching(String name) {
        return ids(unauthenticatedGet(DIRECTORY + "?query=" + encode(name)));
    }

    private void setUniversityStatus(UUID universityId, String status) {
        jdbcTemplate.update("UPDATE universities SET status = ? WHERE id = ?", status, universityId);
    }
}
