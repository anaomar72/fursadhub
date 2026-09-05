package com.fursadhub.organization;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B2 — organization and university profile banners, on the same managed-file
 * architecture as the existing logos.
 *
 * <p>The security surface is what matters here: only the tenant admin may upload, tenant isolation
 * is enforced from membership rather than from the id in the path, the MIME and size policy comes
 * from {@code FileClassification} and cannot be bypassed, and the read route stays public while
 * exposing nothing but the image.
 *
 * <p>Also asserts that adding covers did not disturb logos — the two share a table and a service
 * shape, so a mistake in one would most likely surface as the other breaking.
 */
class InstitutionCoverMediaIT extends AbstractPhase3IT {

    /** A minimal valid PNG (1x1). Content type is what the policy checks; the bytes just need to exist. */
    private static final byte[] PNG = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08,
            0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, (byte) 0xC4, (byte) 0x89};

    // ---------------------------------------------------------------- organization cover

    @Test
    void organizationAdminCanUploadAndReplaceTheCover() {
        String adminToken = registerAndLogin("b2c-org-ok");
        String name = uniqueName("B2C Org OK");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        assertThat(hasCoverInPublicProfile(organizationId)).isFalse();

        assertThat(uploadCover("/api/v1/organizations/" + organizationId + "/cover", adminToken, PNG, "image/png")
                .getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(hasCoverInPublicProfile(organizationId)).isTrue();
        UUID first = coverFileIdOf("organizations", organizationId);

        // Replace: a new stored file, and the pointer moves to it.
        assertThat(uploadCover("/api/v1/organizations/" + organizationId + "/cover", adminToken, PNG, "image/png")
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(coverFileIdOf("organizations", organizationId)).isNotEqualTo(first);
    }

    /**
     * {@code PrivateFileService.requireMagicBytes} checks that the bytes match the DECLARED content
     * type, so a caller cannot smuggle one format past the allowlist by relabelling it. Covers
     * inherit that check for free by going through the same service — worth pinning, because it is
     * the control that makes the MIME allowlist meaningful rather than advisory.
     */
    @Test
    void contentTypeMustMatchTheActualBytes() {
        String adminToken = registerAndLogin("b2c-magic");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Magic"));

        // Real PNG bytes, declared as JPEG.
        ResponseEntity<Map> response =
                uploadCover("/api/v1/organizations/" + organizationId + "/cover", adminToken, PNG, "image/jpeg");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("ORGANIZATION_COVER_FILE_INVALID");
        assertThat(hasCoverInPublicProfile(organizationId)).isFalse();
    }

    @Test
    void publicCoverDocumentIsReadableWithoutAuthenticationAnd404sWhenAbsent() {
        String adminToken = registerAndLogin("b2c-org-read");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Org Read"));

        ResponseEntity<byte[]> missing = restTemplate.getForEntity(
                url("/api/v1/public/organizations/" + organizationId + "/cover/document"), byte[].class);
        assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        uploadCover("/api/v1/organizations/" + organizationId + "/cover", adminToken, PNG, "image/png");

        ResponseEntity<byte[]> present = restTemplate.getForEntity(
                url("/api/v1/public/organizations/" + organizationId + "/cover/document"), byte[].class);
        assertThat(present.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(present.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
        assertThat(present.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).startsWith("inline");
        assertThat(present.getBody()).isNotEmpty();
    }

    @Test
    void nonAdminOrganizationRolesCannotUploadACover() {
        String adminToken = registerAndLogin("b2c-org-rbac");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Org RBAC"));

        for (String role : List.of("RECRUITER", "ORGANIZATION_SUPERVISOR")) {
            String staffEmail = uniqueEmail("b2c-" + role.substring(0, 4).toLowerCase());
            register(staffEmail, "Password123");
            String staffToken = loginAndExtractAccessToken(staffEmail, "Password123");
            insertOrganizationMembership(organizationId, userIdOf(staffEmail), role);

            assertThat(uploadCover("/api/v1/organizations/" + organizationId + "/cover", staffToken, PNG, "image/png")
                    .getStatusCode())
                    .as("%s must not upload a cover", role)
                    .isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void anotherTenantsAdminCannotUploadACoverHere() {
        String adminToken = registerAndLogin("b2c-tenant-a");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Tenant A"));

        String otherToken = registerAndLogin("b2c-tenant-b");
        createVerifiedOrganization(otherToken, uniqueName("B2C Tenant B"));

        assertThat(uploadCover("/api/v1/organizations/" + organizationId + "/cover", otherToken, PNG, "image/png")
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(hasCoverInPublicProfile(organizationId)).isFalse();
    }

    @Test
    void anonymousCallerCannotUploadACover() {
        String adminToken = registerAndLogin("b2c-anon");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Anon"));

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", filePart(PNG, "image/png"));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<Map> response = restTemplate.exchange(
                url("/api/v1/organizations/" + organizationId + "/cover"), HttpMethod.POST,
                new HttpEntity<>(body, headers), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void disallowedContentTypeIsRejectedByTheFilePolicy() {
        String adminToken = registerAndLogin("b2c-mime");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Mime"));

        for (String badType : List.of("application/pdf", "image/svg+xml", "text/html", "application/zip")) {
            ResponseEntity<Map> response = uploadCover(
                    "/api/v1/organizations/" + organizationId + "/cover", adminToken, PNG, badType);
            assertThat(response.getStatusCode()).as("%s must be rejected", badType)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("code")).isEqualTo("ORGANIZATION_COVER_FILE_INVALID");
        }
        assertThat(hasCoverInPublicProfile(organizationId)).isFalse();
    }

    @Test
    void oversizedCoverIsRejectedByTheFilePolicy() {
        String adminToken = registerAndLogin("b2c-size");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Size"));

        // Just over the 5 MB cap declared on FileClassification.ORGANIZATION_COVER.
        byte[] tooLarge = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(PNG, 0, tooLarge, 0, PNG.length);

        ResponseEntity<Map> response =
                uploadCover("/api/v1/organizations/" + organizationId + "/cover", adminToken, tooLarge, "image/png");
        assertThat(response.getStatusCode()).isIn(HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(hasCoverInPublicProfile(organizationId)).isFalse();
    }

    /** Covers and logos share a table and a service shape; neither may disturb the other. */
    @Test
    void logoAndCoverAreIndependent() {
        String adminToken = registerAndLogin("b2c-both");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B2C Both"));

        uploadCover("/api/v1/organizations/" + organizationId + "/logo", adminToken, PNG, "image/png");
        uploadCover("/api/v1/organizations/" + organizationId + "/cover", adminToken, PNG, "image/png");

        Map<String, Object> profile =
                unauthenticatedGet("/api/v1/public/organizations/" + organizationId).getBody();
        assertThat(profile.get("hasLogo")).isEqualTo(true);
        assertThat(profile.get("hasCover")).isEqualTo(true);

        assertThat(restTemplate.getForEntity(
                url("/api/v1/public/organizations/" + organizationId + "/logo/document"), byte[].class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(restTemplate.getForEntity(
                url("/api/v1/public/organizations/" + organizationId + "/cover/document"), byte[].class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(coverFileIdOf("organizations", organizationId))
                .isNotEqualTo(logoFileIdOf("organizations", organizationId));
    }

    // ---------------------------------------------------------------- university cover

    @Test
    void universityAdminCanUploadTheCoverAndOthersCannot() {
        String name = uniqueName("B2C Uni");
        UUID universityId = insertVerifiedUniversity(name);

        String adminEmail = uniqueEmail("b2c-uni-admin");
        register(adminEmail, "Password123");
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN");

        assertThat(uploadCover("/api/v1/universities/" + universityId + "/cover", adminToken, PNG, "image/png")
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(restTemplate.getForEntity(
                url("/api/v1/public/universities/" + universityId + "/cover/document"), byte[].class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);

        String coordinatorEmail = uniqueEmail("b2c-uni-coord");
        register(coordinatorEmail, "Password123");
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");
        insertUniversityMembership(universityId, userIdOf(coordinatorEmail), "DEPARTMENT_COORDINATOR");

        assertThat(uploadCover("/api/v1/universities/" + universityId + "/cover", coordinatorToken, PNG, "image/png")
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void universityCoverRejectsADisallowedContentType() {
        String name = uniqueName("B2C Uni Mime");
        UUID universityId = insertVerifiedUniversity(name);
        String adminEmail = uniqueEmail("b2c-uni-mime");
        register(adminEmail, "Password123");
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN");

        ResponseEntity<Map> response =
                uploadCover("/api/v1/universities/" + universityId + "/cover", adminToken, PNG, "application/pdf");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("UNIVERSITY_COVER_FILE_INVALID");
    }

    // ---------------------------------------------------------------- helpers

    private ResponseEntity<Map> uploadCover(String path, String accessToken, byte[] bytes, String contentType) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", filePart(bytes, contentType));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        return restTemplate.exchange(url(path), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    private HttpEntity<ByteArrayResource> filePart(byte[] bytes, String contentType) {
        ByteArrayResource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return "banner.png";
            }
        };
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType(contentType));
        return new HttpEntity<>(resource, partHeaders);
    }

    private boolean hasCoverInPublicProfile(UUID organizationId) {
        return Boolean.TRUE.equals(
                unauthenticatedGet("/api/v1/public/organizations/" + organizationId).getBody().get("hasCover"));
    }

    private UUID coverFileIdOf(String table, UUID id) {
        return jdbcTemplate.queryForObject(
                "SELECT cover_stored_file_id FROM " + table + " WHERE id = ?", UUID.class, id);
    }

    private UUID logoFileIdOf(String table, UUID id) {
        return jdbcTemplate.queryForObject(
                "SELECT logo_stored_file_id FROM " + table + " WHERE id = ?", UUID.class, id);
    }
}
