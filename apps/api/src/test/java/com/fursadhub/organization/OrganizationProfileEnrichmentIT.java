package com.fursadhub.organization;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B2 — the organization's enriched public profile: sector, location, short summary,
 * size band, founding year and social links, all institution-managed.
 *
 * <p>Covers the write path (authorization, validation, normalisation, full-replacement semantics)
 * and the read path (management detail, public detail, public directory row), including that the
 * private fields still never leave through a public route.
 */
class OrganizationProfileEnrichmentIT extends AbstractPhase3IT {

    // ---------------------------------------------------------------- backward compatibility

    /**
     * The migration is additive: an organization created before B2 has null in every new column and
     * must still be readable everywhere.
     */
    @Test
    void organizationCreatedWithoutTheNewFieldsRemainsValidEverywhere() {
        String adminToken = registerAndLogin("b2-legacy");
        String name = uniqueName("B2 Legacy Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> management = authorizedGet("/api/v1/organizations/" + organizationId, adminToken).getBody();
        assertThat(management.get("name")).isEqualTo(name);
        // non_null serialization omits the unset optional fields entirely.
        assertThat(management).doesNotContainKeys("industry", "city", "countryCode", "shortDescription",
                "companySizeRange", "foundedYear", "linkedinUrl", "xUrl", "instagramUrl", "youtubeUrl");
        assertThat(management.get("hasCover")).isEqualTo(false);

        Map<String, Object> publicDetail =
                unauthenticatedGet("/api/v1/public/organizations/" + organizationId).getBody();
        assertThat(publicDetail.get("hasCover")).isEqualTo(false);
        assertThat(publicDetail.get("verified")).isEqualTo(true);
    }

    // ---------------------------------------------------------------- update

    @Test
    void adminCanPopulateEveryNewProfileField() {
        String adminToken = registerAndLogin("b2-populate");
        String name = uniqueName("B2 Populate Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        ResponseEntity<Map> response = authorizedPatch(
                "/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = response.getBody();
        assertThat(body.get("industry")).isEqualTo("Telecommunications");
        assertThat(body.get("city")).isEqualTo("Mogadishu");
        assertThat(body.get("countryCode")).isEqualTo("SO");
        assertThat(body.get("shortDescription")).isEqualTo("Connecting Somalia.");
        assertThat(body.get("companySizeRange")).isEqualTo("SIZE_201_500");
        assertThat(((Number) body.get("foundedYear")).intValue()).isEqualTo(1994);
        assertThat(body.get("linkedinUrl")).isEqualTo("https://linkedin.com/company/example");
        assertThat(body.get("xUrl")).isEqualTo("https://x.com/example");
        assertThat(body.get("instagramUrl")).isEqualTo("https://instagram.com/example");
        assertThat(body.get("youtubeUrl")).isEqualTo("https://youtube.com/@example");
    }

    /** Lower-case input is stored upper-cased, so a country filter matches however it was typed. */
    @Test
    void countryCodeIsNormalizedToUpperCase() {
        String adminToken = registerAndLogin("b2-country-norm");
        String name = uniqueName("B2 Country Norm");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> body = fullProfile(name);
        body.put("countryCode", "so");

        assertThat(authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body)
                .getBody().get("countryCode")).isEqualTo("SO");
    }

    /** Blank must become null, not an empty string that renders as an empty row on the profile. */
    @Test
    void blankOptionalFieldsAreStoredAsNullRatherThanEmptyStrings() {
        String adminToken = registerAndLogin("b2-blank");
        String name = uniqueName("B2 Blank Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("industry", "   ");
        body.put("city", "");
        body.put("shortDescription", "  ");

        Map<String, Object> updated =
                authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body).getBody();
        assertThat(updated).doesNotContainKeys("industry", "city", "shortDescription");
    }

    /** Internal whitespace collapses, so a filterable value cannot exist in two spellings. */
    @Test
    void industryWhitespaceIsCollapsed() {
        String adminToken = registerAndLogin("b2-collapse");
        String name = uniqueName("B2 Collapse Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("industry", "  Financial   Services  ");

        assertThat(authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body)
                .getBody().get("industry")).isEqualTo("Financial Services");
    }

    // ---------------------------------------------------------------- update semantics

    /**
     * THE compatibility test. An organization has filled in every B2 field; a client written before
     * B2 existed then saves the profile using the only request shape it knows — the four fields this
     * endpoint has always had. Every B2 field must survive untouched.
     *
     * <p>Under plain full-replacement this is the data-loss bug: the old form cannot send fields it
     * does not know about, so each of its saves would silently erase the admin's industry, location,
     * size, founding year and social links. Presence-aware binding is what makes "existing clients
     * omitting new fields must continue to work" true semantically and not merely at compile time.
     */
    @Test
    void aPreB2ClientSavingTheOldRequestShapeCannotEraseTheNewFields() {
        String adminToken = registerAndLogin("b2-compat");
        String name = uniqueName("B2 Compat Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));

        // Exactly the pre-B2 request body: name, registrationNumber, website, description. Nothing
        // else — because nothing else existed when that client was written.
        Map<String, Object> preB2Request = new LinkedHashMap<>();
        preB2Request.put("name", name);
        preB2Request.put("registrationNumber", "REG-PRE-B2");
        preB2Request.put("website", "https://updated-by-old-client.test");
        preB2Request.put("description", "Rewritten by a client that predates B2.");

        assertThat(authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, preB2Request)
                .getStatusCode()).isEqualTo(HttpStatus.OK);

        Map<String, Object> stored =
                authorizedGet("/api/v1/organizations/" + organizationId, adminToken).getBody();

        // Every B2 field, unchanged.
        assertThat(stored.get("industry")).isEqualTo("Telecommunications");
        assertThat(stored.get("city")).isEqualTo("Mogadishu");
        assertThat(stored.get("countryCode")).isEqualTo("SO");
        assertThat(stored.get("shortDescription")).isEqualTo("Connecting Somalia.");
        assertThat(stored.get("companySizeRange")).isEqualTo("SIZE_201_500");
        assertThat(((Number) stored.get("foundedYear")).intValue()).isEqualTo(1994);
        assertThat(stored.get("linkedinUrl")).isEqualTo("https://linkedin.com/company/example");
        assertThat(stored.get("xUrl")).isEqualTo("https://x.com/example");
        assertThat(stored.get("instagramUrl")).isEqualTo("https://instagram.com/example");
        assertThat(stored.get("youtubeUrl")).isEqualTo("https://youtube.com/@example");

        // The pre-B2 fields it DID send were replaced, as that client expects.
        assertThat(stored.get("registrationNumber")).isEqualTo("REG-PRE-B2");
        assertThat(stored.get("website")).isEqualTo("https://updated-by-old-client.test");
        assertThat(stored.get("description")).isEqualTo("Rewritten by a client that predates B2.");
    }

    /**
     * The pre-B2 fields keep FULL REPLACEMENT — omitting one still CLEARS it. That convention is
     * unchanged by this correction, because callers written against it may rely on it; only the
     * newly added fields behave differently.
     */
    @Test
    void omittingALegacyOptionalFieldStillClearsItWhileNewFieldsSurvive() {
        String adminToken = registerAndLogin("b2-legacy-semantics");
        String name = uniqueName("B2 Legacy Semantics");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));

        // Only the required field: every other LEGACY field is omitted.
        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, Map.of("name", name));

        Map<String, Object> stored =
                authorizedGet("/api/v1/organizations/" + organizationId, adminToken).getBody();

        // Legacy: cleared, exactly as before B2. (non_null serialization omits a null field.)
        assertThat(stored).doesNotContainKeys("registrationNumber", "website", "description");
        // B2: preserved.
        assertThat(stored).containsKeys("industry", "city", "countryCode", "shortDescription",
                "companySizeRange", "foundedYear", "linkedinUrl", "xUrl", "instagramUrl", "youtubeUrl");
    }

    /** A field the client actually sends is replaced — presence-aware does not mean read-only. */
    @Test
    void sendingANewFieldReplacesIt() {
        String adminToken = registerAndLogin("b2-explicit-set");
        String name = uniqueName("B2 Explicit Set");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));

        Map<String, Object> change = new LinkedHashMap<>();
        change.put("name", name);
        change.put("industry", "Logistics");
        change.put("foundedYear", 2001);

        Map<String, Object> updated =
                authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, change).getBody();

        assertThat(updated.get("industry")).isEqualTo("Logistics");
        assertThat(((Number) updated.get("foundedYear")).intValue()).isEqualTo(2001);
        // Untouched siblings survive the same save.
        assertThat(updated.get("city")).isEqualTo("Mogadishu");
        assertThat(updated.get("linkedinUrl")).isEqualTo("https://linkedin.com/company/example");
    }

    /**
     * Clearing must remain possible, or an admin could never remove a social link they no longer
     * want published. An explicit JSON null is how the current form says "remove this".
     */
    @Test
    void sendingAnExplicitNullClearsANewField() {
        String adminToken = registerAndLogin("b2-explicit-clear");
        String name = uniqueName("B2 Explicit Clear");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));

        // Hand-written JSON: a Map's null values would be stripped before they left this test.
        String clearing = """
                {"name":"%s","linkedinUrl":null,"foundedYear":null,"companySizeRange":null}"""
                .formatted(name);

        Map<String, Object> updated =
                authorizedPatchJson("/api/v1/organizations/" + organizationId, adminToken, clearing).getBody();

        assertThat(updated).doesNotContainKeys("linkedinUrl", "foundedYear", "companySizeRange");
        // Only what was explicitly nulled is gone.
        assertThat(updated.get("industry")).isEqualTo("Telecommunications");
        assertThat(updated.get("xUrl")).isEqualTo("https://x.com/example");
    }

    /** A blank string is the emptied form input, and clears the field just as an explicit null does. */
    @Test
    void sendingABlankStringAlsoClearsANewField() {
        String adminToken = registerAndLogin("b2-blank-clear");
        String name = uniqueName("B2 Blank Clear");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));

        Map<String, Object> clearing = new LinkedHashMap<>();
        clearing.put("name", name);
        clearing.put("industry", "   ");
        clearing.put("linkedinUrl", "");

        Map<String, Object> updated =
                authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, clearing).getBody();

        assertThat(updated).doesNotContainKeys("industry", "linkedinUrl");
        assertThat(updated.get("city")).isEqualTo("Mogadishu");
    }

    // ---------------------------------------------------------------- validation

    /**
     * Every published-link field is validated as a real URL, not just scheme-prefixed: an unsafe
     * scheme, a missing host and a malformed value are all rejected, on all five fields.
     */
    @Test
    void unsafeOrMalformedUrlsAreRejectedOnEveryLinkField() {
        String adminToken = registerAndLogin("b2-url");
        String name = uniqueName("B2 Url Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        for (String field : List.of("website", "linkedinUrl", "xUrl", "instagramUrl", "youtubeUrl")) {
            for (String unsafe : List.of(
                    // Schemes that execute or read locally in the viewer's browser.
                    "javascript:alert(1)", "data:text/html;base64,PHN2Zz4=", "file:///etc/passwd",
                    // A bare hostname is not a link.
                    "linkedin.com/company/example",
                    // Right scheme, no host.
                    "https://", "http://", "https:///company/example",
                    // Malformed.
                    "://example.com", "https://exa mple.com", "ht!tp://example.com")) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("name", name);
                body.put(field, unsafe);

                ResponseEntity<Map> response =
                        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body);
                assertThat(response.getStatusCode())
                        .as("%s = %s must be rejected", field, unsafe)
                        .isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
            }
        }
    }

    /**
     * Registration must not be a way around the link rule. The website supplied at creation is
     * published on the organization's public profile, so it needs the same validation the profile
     * save has — otherwise the check is one endpoint wide.
     */
    @Test
    void registrationRejectsAnUnsafeWebsiteToo() {
        String adminToken = registerAndLogin("b2-create-url");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", uniqueName("B2 Create Url Org"));
        body.put("type", "COMPANY");
        body.put("website", "javascript:alert(1)");

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations", adminToken, body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void httpAndHttpsUrlsAreAccepted() {
        String adminToken = registerAndLogin("b2-url-ok");
        String name = uniqueName("B2 Url OK");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("website", "http://example.test");
        body.put("linkedinUrl", "HTTPS://linkedin.com/company/example");

        assertThat(authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void foundedYearMustNotBeInTheFutureOrAbsurdlyEarly() {
        String adminToken = registerAndLogin("b2-year");
        String name = uniqueName("B2 Year Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        for (int invalid : List.of(LocalDate.now().getYear() + 1, 1799, 3000)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("name", name);
            body.put("foundedYear", invalid);

            ResponseEntity<Map> response =
                    authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body);
            assertThat(response.getStatusCode()).as("foundedYear %s must be rejected", invalid)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
        }

        Map<String, Object> currentYear = new LinkedHashMap<>();
        currentYear.put("name", name);
        currentYear.put("foundedYear", LocalDate.now().getYear());
        assertThat(authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, currentYear).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void companySizeRangeMustBeAnAllowlistedValue() {
        String adminToken = registerAndLogin("b2-size");
        String name = uniqueName("B2 Size Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("companySizeRange", "ENORMOUS");

        ResponseEntity<Map> response = authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void countryCodeMustBeTwoLetters() {
        String adminToken = registerAndLogin("b2-cc");
        String name = uniqueName("B2 CC Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        for (String invalid : List.of("SOM", "S", "12", "S1")) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("name", name);
            body.put("countryCode", invalid);

            assertThat(authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body).getStatusCode())
                    .as("countryCode %s must be rejected", invalid)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void oversizedProfileTextIsRejected() {
        String adminToken = registerAndLogin("b2-length");
        String name = uniqueName("B2 Length Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("shortDescription", "x".repeat(201));

        assertThat(authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ---------------------------------------------------------------- authorization

    /**
     * Authorization is unchanged by B2 — {@code ORGANIZATION_ADMIN} at THIS organization only. No
     * RBAC rule was relaxed to make any of this pass.
     */
    @Test
    void recruiterAndSupervisorCannotEditTheInstitutionProfile() {
        String adminToken = registerAndLogin("b2-rbac-admin");
        String name = uniqueName("B2 RBAC Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        for (String role : List.of("RECRUITER", "ORGANIZATION_SUPERVISOR")) {
            String staffEmail = uniqueEmail("b2-" + role.substring(0, 4).toLowerCase());
            register(staffEmail, "Password123");
            String staffToken = loginAndExtractAccessToken(staffEmail, "Password123");
            insertOrganizationMembership(organizationId, userIdOf(staffEmail), role);

            ResponseEntity<Map> response =
                    authorizedPatch("/api/v1/organizations/" + organizationId, staffToken, Map.of("name", "Hijacked"));
            assertThat(response.getStatusCode()).as("%s must not edit the profile", role)
                    .isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
        }
    }

    @Test
    void anotherOrganizationsAdminCannotEditThisProfile() {
        String adminToken = registerAndLogin("b2-tenant-a");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2 Tenant A"));

        String otherToken = registerAndLogin("b2-tenant-b");
        createVerifiedOrganization(otherToken, uniqueName("B2 Tenant B"));

        ResponseEntity<Map> response =
                authorizedPatch("/api/v1/organizations/" + organizationId, otherToken, Map.of("name", "Hijacked"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anonymousCallerCannotEditTheProfile() {
        String adminToken = registerAndLogin("b2-anon");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2 Anon Org"));

        ResponseEntity<Map> response = restTemplate.exchange(
                url("/api/v1/organizations/" + organizationId),
                org.springframework.http.HttpMethod.PATCH,
                new org.springframework.http.HttpEntity<>(Map.of("name", "Hijacked"),
                        jsonHeaders()),
                Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ---------------------------------------------------------------- public read surface

    @Test
    void publicProfileExposesTheNewFieldsAndNoPrivateOnes() {
        String adminToken = registerAndLogin("b2-public");
        String name = uniqueName("B2 Public Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);
        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));
        jdbcTemplate.update("UPDATE organizations SET registration_number = 'SECRET-B2' WHERE id = ?", organizationId);

        Map<String, Object> body = unauthenticatedGet("/api/v1/public/organizations/" + organizationId).getBody();

        assertThat(body.keySet()).containsExactlyInAnyOrder(
                "id", "name", "slug", "type", "industry", "city", "countryCode", "shortDescription",
                "description", "website", "companySizeRange", "foundedYear",
                "linkedinUrl", "xUrl", "instagramUrl", "youtubeUrl", "verified", "hasLogo", "hasCover");
        assertThat(body).doesNotContainKeys("registrationNumber", "verificationStatus", "verifiedAt",
                "evidenceStoredFileId", "evidenceUploadedAt", "logoStoredFileId", "coverStoredFileId",
                "coverUploadedAt", "createdAt", "updatedAt", "members", "staff");
        assertThat(body.toString()).doesNotContain("SECRET-B2");
    }

    @Test
    void directoryRowCarriesTheNewSummaryFieldsAndNoPrivateOnes() {
        String adminToken = registerAndLogin("b2-dir-row");
        String name = uniqueName("B2 Directory Row");
        UUID organizationId = createVerifiedOrganization(adminToken, name);
        authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, fullProfile(name));
        jdbcTemplate.update("UPDATE organizations SET registration_number = 'SECRET-ROW' WHERE id = ?", organizationId);

        Map<String, Object> row = singleDirectoryRow(name);

        assertThat(row.keySet()).containsExactlyInAnyOrder(
                "id", "name", "slug", "type", "industry", "city", "countryCode", "shortDescription",
                "description", "website", "verified", "hasLogo", "hasCover", "openOpportunityCount");
        // Deliberately card-scoped: founded year, size and social links belong on the profile page.
        assertThat(row).doesNotContainKeys("companySizeRange", "foundedYear",
                "linkedinUrl", "xUrl", "instagramUrl", "youtubeUrl",
                "registrationNumber", "verificationStatus");
        assertThat(row.toString()).doesNotContain("SECRET-ROW");
    }

    // ---------------------------------------------------------------- published contract

    /**
     * The presence-aware wrapper is a server-side binding detail and must not leak into the API
     * contract. If it did, the published schema would tell every consumer to send
     * {@code {"industry": {"present": true, "value": "Logistics"}}} — which the server rejects.
     */
    @Test
    @SuppressWarnings("unchecked")
    void openApiDocumentsPresenceAwareFieldsAsPlainValues() {
        Map<String, Object> apiDocs = unauthenticatedGet("/api-docs").getBody();

        Map<String, Object> schemas =
                (Map<String, Object>) ((Map<String, Object>) apiDocs.get("components")).get("schemas");
        Map<String, Object> properties =
                (Map<String, Object>) ((Map<String, Object>) schemas.get("UpdateOrganizationRequest"))
                        .get("properties");

        for (String field : List.of("industry", "city", "countryCode", "shortDescription",
                "linkedinUrl", "xUrl", "instagramUrl", "youtubeUrl")) {
            assertThat((Map<String, Object>) properties.get(field))
                    .as("%s must be documented as a plain string", field)
                    .containsEntry("type", "string")
                    .doesNotContainKeys("$ref", "present", "value");
        }
        assertThat((Map<String, Object>) properties.get("foundedYear")).containsEntry("type", "integer");
        // The enum keeps its allowlist rather than becoming an opaque wrapper object.
        assertThat(properties.get("companySizeRange").toString()).contains("SIZE_201_500");
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> fullProfile(String name) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("website", "https://example.test");
        body.put("description", "A full profile body.");
        body.put("industry", "Telecommunications");
        body.put("city", "Mogadishu");
        body.put("countryCode", "SO");
        body.put("shortDescription", "Connecting Somalia.");
        body.put("companySizeRange", "SIZE_201_500");
        body.put("foundedYear", 1994);
        body.put("linkedinUrl", "https://linkedin.com/company/example");
        body.put("xUrl", "https://x.com/example");
        body.put("instagramUrl", "https://instagram.com/example");
        body.put("youtubeUrl", "https://youtube.com/@example");
        return body;
    }

    private Map<String, Object> singleDirectoryRow(String name) {
        List<Map<String, Object>> rows =
                rows(unauthenticatedGet("/api/v1/public/organizations?query=" + encode(name)));
        assertThat(rows).as("expected one directory row named %s", name).hasSize(1);
        return rows.get(0);
    }

    private org.springframework.http.HttpHeaders jsonHeaders() {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        return headers;
    }
}
