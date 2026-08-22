package com.fursadhub.opportunity;

import com.fursadhub.identity.AbstractIdentityIT;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Shared HTTP/fixture helpers for Phase 3 (organizations/opportunities) integration tests.
 * Reuses {@link AbstractIdentityIT}'s Testcontainers PostgreSQL instance, mirroring the
 * Phase 2 {@code UniversityVerificationAuthorizationIT} pattern.
 */
abstract class AbstractPhase3IT extends AbstractIdentityIT {

    static final UUID JAMHURIYA_UNIVERSITY_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    static final UUID CS_DEPARTMENT_ID = UUID.fromString("11111111-1111-4111-8111-1111111110c1");
    static final UUID BA_DEPARTMENT_ID = UUID.fromString("11111111-1111-4111-8111-1111111110c2");

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

    protected Map<String, Object> targetBody(UUID universityId, List<UUID> departmentIds, int requestedNominees, LocalDate nominationDeadline) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("universityId", universityId.toString());
        body.put("departmentIds", departmentIds.stream().map(UUID::toString).toList());
        body.put("requestedNominees", requestedNominees);
        body.put("nominationDeadline", nominationDeadline.toString());
        return body;
    }
}
