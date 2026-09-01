package com.fursadhub.administration;

import com.fursadhub.internshipmanagement.AbstractPhase6IT;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Shared fixtures for Phase 7 (files, notifications, privacy, admin, audit) integration tests.
 *
 * <p>Inherits the whole Phase 0-6 fixture chain, so a Phase 7 test can build a real internship and
 * then check what an administrator can and cannot see about it.
 *
 * <p>Platform-role grants drop to SQL for the FIRST admin only, and for the same reason Phases 4-6
 * insert staff memberships that way: there is no endpoint that can create it, because granting a
 * platform role requires an existing SUPER_ADMIN. Every subsequent grant in these tests goes through
 * the real endpoint, so the authorization on it is exercised rather than bypassed.
 */
public abstract class AbstractPhase7IT extends AbstractPhase6IT {

    /**
     * A GET with no Authorization header.
     *
     * <p>Phase 3 has an equivalent, but on a package-private base class outside this inheritance
     * chain (Phase 4 extends {@code AbstractIdentityIT} directly), so it is repeated here rather than
     * restructuring four phases of test fixtures to share four lines.
     */
    protected ResponseEntity<Map> unauthenticatedGet(String path) {
        return restTemplate.getForEntity(url(path), Map.class);
    }

    // ---------------------------------------------------------------- platform admins

    /**
     * Creates a verified account and grants it a platform role directly in SQL.
     *
     * <p>This is the bootstrap path only. Tests that care about the GRANT endpoint call
     * {@link #grantPlatformRole} instead, which goes through HTTP and is authorized.
     */
    protected Staff platformAdmin(String prefix, String role) {
        String email = uniqueEmail(emailPrefix(prefix));
        registerVerifiedUser(email);
        String token = loginAndExtractAccessToken(email, "Password123");
        UUID userId = userIdOf(email);
        jdbcTemplate.update(
                "INSERT INTO platform_admins (id, user_id, role, granted_at) VALUES (?, ?, ?, now())",
                UUID.randomUUID(), userId, role);
        return new Staff(email, userId, token);
    }

    protected Staff superAdmin(String prefix) {
        return platformAdmin(prefix, "SUPER_ADMIN");
    }

    protected Staff verificationOfficer(String prefix) {
        return platformAdmin(prefix, "VERIFICATION_OFFICER");
    }

    protected ResponseEntity<Map> grantPlatformRole(String actorToken, UUID targetUserId, String role) {
        return authorizedPost("/api/v1/admin/platform-roles", actorToken,
                Map.of("userId", targetUserId.toString(), "role", role));
    }

    protected int countActivePlatformGrants(UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_admins WHERE user_id = ? AND revoked_at IS NULL",
                Integer.class, userId);
        return count == null ? 0 : count;
    }

    // ---------------------------------------------------------------- organizations

    /**
     * Creates an UNVERIFIED organization through the real endpoint.
     *
     * <p>Phase 4's {@code createVerifiedOrganization} forces the row to VERIFIED in SQL, which is
     * exactly what the Phase 7 verification tests must NOT do — they exist to drive that transition
     * through the reviewer endpoints. Creating it also makes the caller its ORGANIZATION_ADMIN, which
     * is what the outcome notification is delivered to.
     */
    protected UUID createOrganization(String accessToken, String name) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations", accessToken,
                Map.of("name", name, "type", "COMPANY"));
        requireOk(response, "Create organization");
        return UUID.fromString((String) response.getBody().get("id"));
    }

    // ---------------------------------------------------------------- accounts

    protected String userStatus(UUID userId) {
        return jdbcTemplate.queryForObject("SELECT status FROM users WHERE id = ?", String.class, userId);
    }

    protected int countActiveRefreshTokens(UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL",
                Integer.class, userId);
        return count == null ? 0 : count;
    }

    // ---------------------------------------------------------------- notifications

    protected int countNotifications(UUID userId, String type) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM notifications WHERE user_id = ? AND notification_type = ?",
                Integer.class, userId, type);
        return count == null ? 0 : count;
    }

    protected long unreadCount(String token) {
        ResponseEntity<Map> response = authorizedGet("/api/v1/me/notifications/unread-count", token);
        requireOk(response, "Unread count");
        return ((Number) response.getBody().get("unreadCount")).longValue();
    }

    // ---------------------------------------------------------------- legal documents

    protected UUID publishLegalDocument(
            String adminToken, String documentType, String version, String locale, LocalDate effectiveFrom) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/admin/legal-documents", adminToken, Map.of(
                "documentType", documentType,
                "version", version,
                "locale", locale,
                "title", documentType + " " + version,
                "body", "Body of " + documentType + " " + version + " (" + locale + ").",
                "effectiveFrom", effectiveFrom.toString()));
        requireOk(response, "Publish legal document");
        return UUID.fromString((String) response.getBody().get("id"));
    }

    // ---------------------------------------------------------------- private files

    /** A minimal but genuinely valid PNG — the magic-byte check is real, so the header must be right. */
    protected byte[] validPngBytes() {
        byte[] header = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        byte[] body = "fursadhub-test-image".getBytes(StandardCharsets.UTF_8);
        byte[] png = new byte[header.length + body.length];
        System.arraycopy(header, 0, png, 0, header.length);
        System.arraycopy(body, 0, png, header.length, body.length);
        return png;
    }

    protected ResponseEntity<Map> uploadCv(String token, String filename, String contentType, byte[] content) {
        return multipartPost("/api/v1/students/me/cv", token, filename, contentType, content);
    }

    protected ResponseEntity<Map> uploadEvidence(String token, String filename, String contentType, byte[] content) {
        return multipartPost("/api/v1/students/me/verification/evidence", token, filename, contentType, content);
    }

    protected ResponseEntity<Map> uploadOrganizationEvidence(
            String token, UUID organizationId, String filename, String contentType, byte[] content) {
        return multipartPost(
                "/api/v1/organizations/" + organizationId + "/verification/evidence",
                token, filename, contentType, content);
    }

    /**
     * Attaches a license and submits the organization for review — the only route to SUBMITTED since
     * Phase 7.5. Tests that care about the license gate call the two steps separately; everyone else
     * just wants an organization sitting in the reviewer's queue.
     */
    protected void submitOrganizationForVerification(String adminToken, UUID organizationId) {
        requireOk(uploadOrganizationEvidence(
                adminToken, organizationId, "license.pdf", "application/pdf", validPdfBytes()),
                "Upload organization license");
        requireOk(authorizedPost(
                "/api/v1/organizations/" + organizationId + "/verification/submit", adminToken, null),
                "Submit for verification");
    }

    protected ResponseEntity<Map> multipartPost(
            String path, String token, String filename, String contentType, byte[] content) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType(contentType));
        body.add("file", new HttpEntity<>(resource, partHeaders));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        return restTemplate.exchange(url(path), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    /**
     * Downloads a private document as raw bytes.
     *
     * <p>Deliberately NOT deserialized as a Map: these routes stream binary content, and the test
     * needs to assert on the status, the headers and the bytes exactly as a browser would see them.
     */
    protected ResponseEntity<byte[]> downloadDocument(String path, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(url(path), HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
    }

    // ---------------------------------------------------------------- verification cases

    /** The caller's own verification case id, read through the student's own endpoint. */
    protected UUID myVerificationCaseId(String studentToken) {
        ResponseEntity<Map> response = authorizedGet("/api/v1/students/me/verification", studentToken);
        requireOk(response, "My verification case");
        return UUID.fromString((String) response.getBody().get("id"));
    }

    /**
     * A student with a SUBMITTED verification case, built through the real endpoints.
     *
     * <p>{@code createStudent} inserts a DRAFT enrollment, and submitting it through the API is what
     * creates the case — so the case here is exactly the one production would produce.
     */
    protected StudentFixture studentWithSubmittedCase(String prefix, UUID universityId, UUID departmentId) {
        StudentFixture student = createStudent(prefix, universityId, departmentId, "DRAFT");
        requireOk(authorizedPost(
                        "/api/v1/students/me/enrollment/submit-verification", student.accessToken(), null),
                "Submit verification");
        return student;
    }

    protected List<Map<String, Object>> escalationQueue(String token) {
        ResponseEntity<List> response = authorizedGetList("/api/v1/admin/verification-escalations", token);
        requireOk(response, "Escalation queue");
        return response.getBody();
    }
}
