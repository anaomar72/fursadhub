package com.fursadhub.university;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B2 — the university's enriched public profile: country, a published contact address
 * and the banner flag. Deliberately smaller than the organization's set, because {@code city},
 * {@code website} and {@code description} already existed and are reused rather than duplicated.
 */
class UniversityProfileEnrichmentIT extends AbstractPhase3IT {

    /** Additive migration: a university created before B2 stays valid with the new columns null. */
    @Test
    void universityCreatedWithoutTheNewFieldsRemainsValid() {
        UUID universityId = insertVerifiedUniversity(uniqueName("B2U Legacy"));

        Map<String, Object> body = unauthenticatedGet("/api/v1/public/universities/" + universityId).getBody();

        assertThat(body.get("verified")).isEqualTo(true);
        assertThat(body.get("hasCover")).isEqualTo(false);
        assertThat(body).doesNotContainKeys("countryCode", "publicContactEmail");
    }

    @Test
    void universityAdminCanPopulateTheNewFields() {
        UniversityFixture fixture = universityWithAdmin("b2u-populate");

        ResponseEntity<Map> response = authorizedPatch(
                "/api/v1/universities/" + fixture.universityId(), fixture.adminToken(), fullProfile(fixture.name()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("countryCode")).isEqualTo("SO");
        assertThat(response.getBody().get("publicContactEmail")).isEqualTo("careers@example.test");
        assertThat(response.getBody().get("city")).isEqualTo("Mogadishu");
    }

    @Test
    void countryCodeIsNormalizedAndValidated() {
        UniversityFixture fixture = universityWithAdmin("b2u-country");

        Map<String, Object> lower = fullProfile(fixture.name());
        lower.put("countryCode", "so");
        assertThat(authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(), lower)
                .getBody().get("countryCode")).isEqualTo("SO");

        for (String invalid : List.of("SOM", "S", "1A")) {
            Map<String, Object> body = fullProfile(fixture.name());
            body.put("countryCode", invalid);
            assertThat(authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(), body)
                    .getStatusCode())
                    .as("countryCode %s must be rejected", invalid)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void publicContactEmailMustBeAValidAddress() {
        UniversityFixture fixture = universityWithAdmin("b2u-email");

        Map<String, Object> body = fullProfile(fixture.name());
        body.put("publicContactEmail", "not-an-email");

        ResponseEntity<Map> response =
                authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(), body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    // ---------------------------------------------------------------- update semantics

    /**
     * THE compatibility test, university side. A client written before B2 saves the profile with the
     * only request shape it knows — the five fields this endpoint has always had — and both B2
     * fields must survive untouched. Under plain full-replacement each such save would erase them.
     */
    @Test
    void aPreB2ClientSavingTheOldRequestShapeCannotEraseTheNewFields() {
        UniversityFixture fixture = universityWithAdmin("b2u-compat");
        authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                fullProfile(fixture.name()));

        // Exactly the pre-B2 body: no countryCode, no publicContactEmail.
        Map<String, Object> preB2Request = new LinkedHashMap<>();
        preB2Request.put("name", fixture.name());
        preB2Request.put("city", "Hargeisa");
        preB2Request.put("registrationNumber", "UNI-PRE-B2");
        preB2Request.put("website", "https://updated-by-old-client.test");
        preB2Request.put("description", "Rewritten by a client that predates B2.");

        assertThat(authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                preB2Request).getStatusCode()).isEqualTo(HttpStatus.OK);

        Map<String, Object> stored =
                authorizedGet("/api/v1/universities/" + fixture.universityId(), fixture.adminToken()).getBody();

        assertThat(stored.get("countryCode")).isEqualTo("SO");
        assertThat(stored.get("publicContactEmail")).isEqualTo("careers@example.test");
        // The pre-B2 fields it did send were replaced, as that client expects.
        assertThat(stored.get("city")).isEqualTo("Hargeisa");
        assertThat(stored.get("registrationNumber")).isEqualTo("UNI-PRE-B2");
        assertThat(stored.get("website")).isEqualTo("https://updated-by-old-client.test");
    }

    /** Legacy fields keep FULL REPLACEMENT: omitting one still clears it, while B2 fields survive. */
    @Test
    void omittingALegacyOptionalFieldStillClearsItWhileNewFieldsSurvive() {
        UniversityFixture fixture = universityWithAdmin("b2u-legacy-semantics");
        authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                fullProfile(fixture.name()));

        authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                Map.of("name", fixture.name()));

        Map<String, Object> stored =
                authorizedGet("/api/v1/universities/" + fixture.universityId(), fixture.adminToken()).getBody();

        assertThat(stored).doesNotContainKeys("city", "website", "description");
        assertThat(stored).containsKeys("countryCode", "publicContactEmail");
    }

    @Test
    void sendingANewFieldReplacesIt() {
        UniversityFixture fixture = universityWithAdmin("b2u-explicit-set");
        authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                fullProfile(fixture.name()));

        Map<String, Object> change = new LinkedHashMap<>();
        change.put("name", fixture.name());
        change.put("publicContactEmail", "internships@example.test");

        Map<String, Object> updated = authorizedPatch(
                "/api/v1/universities/" + fixture.universityId(), fixture.adminToken(), change).getBody();

        assertThat(updated.get("publicContactEmail")).isEqualTo("internships@example.test");
        assertThat(updated.get("countryCode")).isEqualTo("SO");
    }

    /** Clearing must stay possible — an explicit JSON null removes a published value. */
    @Test
    void sendingAnExplicitNullClearsANewField() {
        UniversityFixture fixture = universityWithAdmin("b2u-explicit-clear");
        authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                fullProfile(fixture.name()));

        // Hand-written JSON: a Map's null values would be stripped before they left this test.
        String clearing = """
                {"name":"%s","publicContactEmail":null}""".formatted(fixture.name());

        Map<String, Object> updated = authorizedPatchJson(
                "/api/v1/universities/" + fixture.universityId(), fixture.adminToken(), clearing).getBody();

        assertThat(updated).doesNotContainKey("publicContactEmail");
        assertThat(updated.get("countryCode")).isEqualTo("SO");
    }

    // ---------------------------------------------------------------- validation

    @Test
    void unsafeOrMalformedWebsitesAreRejected() {
        UniversityFixture fixture = universityWithAdmin("b2u-url");

        for (String unsafe : List.of("javascript:alert(1)", "data:text/html,x", "file:///tmp/x",
                "example.test", "https://", "http://", "://example.test", "https://exa mple.test")) {
            Map<String, Object> body = fullProfile(fixture.name());
            body.put("website", unsafe);
            assertThat(authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(), body)
                    .getStatusCode())
                    .as("website %s must be rejected", unsafe)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Registration must not be a way around the link rule — the website supplied at creation is
     * published on the public profile, so it needs the same validation the profile save has.
     */
    @Test
    void registrationRejectsAnUnsafeWebsiteToo() {
        String founderToken = registerAndLogin("b2u-create-url");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", uniqueName("B2U Create Url"));
        body.put("website", "javascript:alert(1)");

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities", founderToken, body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    /** Authorization unchanged: institution-level profile editing is UNIVERSITY_ADMIN only. */
    @Test
    void coordinatorAndSupervisorCannotEditTheInstitutionProfile() {
        UniversityFixture fixture = universityWithAdmin("b2u-rbac");

        for (String role : List.of("DEPARTMENT_COORDINATOR", "UNIVERSITY_SUPERVISOR")) {
            String staffEmail = uniqueEmail("b2u-" + role.substring(0, 4).toLowerCase());
            register(staffEmail, "Password123");
            String staffToken = loginAndExtractAccessToken(staffEmail, "Password123");
            insertUniversityMembership(fixture.universityId(), userIdOf(staffEmail), role);

            ResponseEntity<Map> response = authorizedPatch(
                    "/api/v1/universities/" + fixture.universityId(), staffToken, Map.of("name", "Hijacked"));
            assertThat(response.getStatusCode()).as("%s must not edit the profile", role)
                    .isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void anotherUniversitysAdminCannotEditThisProfile() {
        UniversityFixture target = universityWithAdmin("b2u-tenant-a");
        UniversityFixture other = universityWithAdmin("b2u-tenant-b");

        assertThat(authorizedPatch("/api/v1/universities/" + target.universityId(), other.adminToken(),
                Map.of("name", "Hijacked")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void publicProfileExposesTheNewFieldsAndNoPrivateOnes() {
        UniversityFixture fixture = universityWithAdmin("b2u-public");
        authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                fullProfile(fixture.name()));
        jdbcTemplate.update("UPDATE universities SET registration_number = 'SECRET-UNI-B2' WHERE id = ?",
                fixture.universityId());

        Map<String, Object> body =
                unauthenticatedGet("/api/v1/public/universities/" + fixture.universityId()).getBody();

        assertThat(body.keySet()).containsExactlyInAnyOrder(
                "id", "name", "slug", "city", "countryCode", "website", "description",
                "publicContactEmail", "verified", "hasLogo", "hasCover");
        assertThat(body).doesNotContainKeys("registrationNumber", "status", "verifiedAt",
                "evidenceStoredFileId", "logoStoredFileId", "coverStoredFileId", "createdAt", "updatedAt",
                "departments", "staff", "students", "placements");
        assertThat(body.toString()).doesNotContain("SECRET-UNI-B2");
    }

    /**
     * The directory row carries country but deliberately NOT the contact address — a published email
     * belongs on a profile page someone chose to open, not in a scrapable grid.
     */
    @Test
    void directoryRowCarriesCountryButNotTheContactAddress() {
        UniversityFixture fixture = universityWithAdmin("b2u-dir");
        authorizedPatch("/api/v1/universities/" + fixture.universityId(), fixture.adminToken(),
                fullProfile(fixture.name()));

        List<Map<String, Object>> rows =
                rows(unauthenticatedGet("/api/v1/public/universities?query=" + encode(fixture.name())));
        assertThat(rows).hasSize(1);

        assertThat(rows.get(0).keySet()).containsExactlyInAnyOrder(
                "id", "name", "slug", "city", "countryCode", "description", "website",
                "verified", "hasLogo", "hasCover");
        assertThat(rows.get(0)).doesNotContainKey("publicContactEmail");
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> fullProfile(String name) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("city", "Mogadishu");
        body.put("countryCode", "SO");
        body.put("website", "https://example.test");
        body.put("description", "A public university profile body.");
        body.put("publicContactEmail", "careers@example.test");
        return body;
    }

    private UniversityFixture universityWithAdmin(String prefix) {
        String name = uniqueName("B2U " + prefix);
        UUID universityId = insertVerifiedUniversity(name);

        String adminEmail = uniqueEmail(prefix);
        register(adminEmail, "Password123");
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN");

        return new UniversityFixture(universityId, name, adminToken);
    }

    private record UniversityFixture(UUID universityId, String name, String adminToken) {
    }
}
