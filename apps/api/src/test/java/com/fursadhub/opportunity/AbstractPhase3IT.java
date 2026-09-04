package com.fursadhub.opportunity;

import com.fursadhub.identity.AbstractIdentityIT;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Shared HTTP/fixture helpers for Phase 3 (organizations/opportunities) integration tests.
 * Reuses {@link AbstractIdentityIT}'s Testcontainers PostgreSQL instance, mirroring the
 * Phase 2 {@code UniversityVerificationAuthorizationIT} pattern.
 *
 * <p>Public since Backend Phase B1: the public organization and university directory tests live in
 * their own modules' packages but need exactly these organization/opportunity fixtures, and
 * duplicating them would let the two copies drift.
 */
public abstract class AbstractPhase3IT extends AbstractIdentityIT {

    /**
     * Phase 8 removed the seeded pilot tenant — universities are fully self-registering now, so
     * every test gets its own fresh, already-VERIFIED university and two departments instead of
     * sharing one Flyway-seeded row (which no longer exists).
     */
    UUID defaultUniversityId;
    UUID csDepartmentId;
    UUID baDepartmentId;

    @BeforeEach
    void setUpDefaultUniversity() {
        defaultUniversityId = insertVerifiedUniversity("Test University " + UUID.randomUUID());
        csDepartmentId = insertDepartment(defaultUniversityId, "Computer Science", "CS");
        baDepartmentId = insertDepartment(defaultUniversityId, "Business Administration", "BA");
    }

    protected ResponseEntity<Map> authorizedGet(String path, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url(path), HttpMethod.GET, new HttpEntity<>(headers), Map.class);
    }

    protected ResponseEntity<Map> authorizedPost(String path, String accessToken, Object body) {
        return authorizedExchange(path, HttpMethod.POST, accessToken, body);
    }

    protected ResponseEntity<Map> authorizedPatch(String path, String accessToken, Object body) {
        return authorizedExchange(path, HttpMethod.PATCH, accessToken, body);
    }

    protected ResponseEntity<Map> authorizedDelete(String path, String accessToken) {
        return authorizedExchange(path, HttpMethod.DELETE, accessToken, null);
    }

    private ResponseEntity<Map> authorizedExchange(String path, HttpMethod method, String accessToken, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), method, new HttpEntity<>(body, headers), Map.class);
    }

    protected ResponseEntity<Map> unauthenticatedGet(String path) {
        return restTemplate.getForEntity(url(path), Map.class);
    }

    /** Registers, logs in, and returns the caller's access token. */
    protected String registerAndLogin(String emailPrefix) {
        String email = uniqueEmail(emailPrefix);
        register(email, "Password123");
        return loginAndExtractAccessToken(email, "Password123");
    }

    protected UUID userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    /** Creates a DRAFT organization through the public API, with {@code accessToken}'s user as founding admin. */
    protected UUID createOrganization(String accessToken, String name) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations", accessToken,
                Map.of("name", name, "type", "COMPANY"));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Organization creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    /** Convenience: creates an organization and immediately marks it VERIFIED (bypassing the not-yet-built admin review flow). */
    protected UUID createVerifiedOrganization(String accessToken, String name) {
        UUID organizationId = createOrganization(accessToken, name);
        markOrganizationVerified(organizationId);
        return organizationId;
    }

    protected void markOrganizationVerified(UUID organizationId) {
        jdbcTemplate.update(
                "UPDATE organizations SET verification_status = 'VERIFIED', verified_at = now() WHERE id = ?", organizationId);
    }

    /**
     * Gives an organization a logo without going through the upload endpoint, so a test can assert
     * on {@code hasLogo} without needing object storage. Only the metadata row matters here —
     * {@code hasLogo} is derived from the pointer being non-null, never from the bytes.
     */
    protected void attachOrganizationLogo(UUID organizationId) {
        UUID storedFileId = UUID.randomUUID();
        UUID uploaderId = jdbcTemplate.queryForObject(
                "SELECT user_id FROM organization_memberships WHERE organization_id = ? LIMIT 1",
                UUID.class, organizationId);
        jdbcTemplate.update("""
                INSERT INTO stored_files
                    (id, storage_key, original_filename, content_type, size_bytes, classification,
                     retention_category, uploaded_by, created_at)
                VALUES (?, ?, 'logo.png', 'image/png', 1024, 'ORGANIZATION_LOGO', 'ACCOUNT_ASSET', ?, now())
                """, storedFileId, "test-logo-" + storedFileId, uploaderId);
        jdbcTemplate.update(
                "UPDATE organizations SET logo_stored_file_id = ?, logo_uploaded_at = now() WHERE id = ?",
                storedFileId, organizationId);
    }

    protected UUID insertOrganizationMembership(UUID organizationId, UUID userId, String role) {
        UUID membershipId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO organization_memberships (id, organization_id, user_id, role, assigned_at) VALUES (?, ?, ?, ?, now())",
                membershipId, organizationId, userId, role);
        return membershipId;
    }

    /** Draft-opportunity field defaults; override individual keys via {@code overrides}. */
    protected Map<String, Object> draftOpportunityBody(String mode, Map<String, Object> overrides) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", "Backend Engineering Intern");
        body.put("description", "Work with our platform team on core services.");
        body.put("responsibilities", "Ship features, write tests.");
        body.put("requirements", "Comfortable with Java or TypeScript.");
        body.put("mode", mode);
        body.put("numberOfOpenings", 3);
        body.put("workMode", "HYBRID");
        body.put("location", "Mogadishu");
        body.put("startDate", LocalDate.now().plusMonths(2).toString());
        body.put("endDate", LocalDate.now().plusMonths(5).toString());
        if (!"UNIVERSITY_TARGETED".equals(mode)) {
            body.put("applicationDeadline", LocalDate.now().plusMonths(1).toString());
        }
        body.putAll(overrides);
        return body;
    }

    protected UUID createDraftOpportunity(String accessToken, UUID organizationId, String mode, Map<String, Object> overrides) {
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organizationId + "/opportunities", accessToken, draftOpportunityBody(mode, overrides));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Opportunity creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    protected UUID insertVerifiedUniversity(String name) {
        UUID universityId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO universities (id, name, slug, city, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'VERIFIED', now(), now())",
                universityId, name, "univ-" + universityId, "Testville");
        return universityId;
    }

    protected UUID insertDepartment(UUID universityId, String name, String code) {
        UUID departmentId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO departments (id, university_id, name, code, created_at) VALUES (?, ?, ?, ?, now())",
                departmentId, universityId, name, code);
        return departmentId;
    }

    // ---------------------------------------------------------------- paged public response helpers
    //
    // Added in Backend Phase B1 for the public directory tests. Every FursadHub list endpoint returns
    // the same PageResponse envelope, so reading one is worth doing in exactly one place.

    /** The {@code content} array of a {@code PageResponse} body. */
    @SuppressWarnings("unchecked")
    protected List<Map<String, Object>> rows(ResponseEntity<Map> response) {
        if (response.getStatusCode() != HttpStatus.OK) {
            throw new IllegalStateException("Expected 200 from a page endpoint but got " + response.getStatusCode()
                    + ": " + response.getBody());
        }
        return (List<Map<String, Object>>) response.getBody().get("content");
    }

    protected List<String> ids(ResponseEntity<Map> response) {
        return rows(response).stream().map(row -> (String) row.get("id")).toList();
    }

    protected List<String> names(ResponseEntity<Map> response) {
        return rows(response).stream().map(row -> (String) row.get("name")).toList();
    }

    /**
     * A name unique to one test run, so directory assertions can be exact even though every test in
     * the suite shares one database and one directory.
     */
    protected String uniqueName(String prefix) {
        return prefix + " " + UUID.randomUUID();
    }

    /** Query-string encoding, so a fixture name containing spaces survives the round trip. */
    protected String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    protected Map<String, Object> targetBody(UUID universityId, List<UUID> departmentIds, int requestedNominees, LocalDate nominationDeadline) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("universityId", universityId.toString());
        body.put("departmentIds", departmentIds.stream().map(UUID::toString).toList());
        body.put("requestedNominees", requestedNominees);
        body.put("nominationDeadline", nominationDeadline.toString());
        return body;
    }
}
