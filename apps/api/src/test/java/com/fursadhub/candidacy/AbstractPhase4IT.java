package com.fursadhub.candidacy;

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
 * Shared HTTP/fixture helpers for Phase 4 (recruitment) integration tests, reusing the
 * Testcontainers PostgreSQL instance from {@link AbstractIdentityIT} (CLAUDE.md section 59 — no H2).
 *
 * <p>Fixtures deliberately go through the real HTTP API wherever a Phase 0-3 endpoint exists, and
 * drop to SQL only for state that has no endpoint yet (organization verification, staff membership,
 * student verification approval) — so these tests exercise the production authorization paths rather
 * than a parallel test-only universe.
 */
public abstract class AbstractPhase4IT extends AbstractIdentityIT {

    protected ResponseEntity<Map> authorizedGet(String path, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url(path), HttpMethod.GET, new HttpEntity<>(headers), Map.class);
    }

    protected ResponseEntity<List> authorizedGetList(String path, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url(path), HttpMethod.GET, new HttpEntity<>(headers), List.class);
    }

    protected ResponseEntity<Map> authorizedPost(String path, String accessToken, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    protected ResponseEntity<Map> unauthenticatedPost(String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    // ---------------------------------------------------------------- accounts

    /** Registers, verifies the email (so the account becomes ACTIVE), and logs in. */
    protected String registerVerifiedAndLogin(String emailPrefix) {
        String email = uniqueEmail(emailPrefix);
        registerVerifiedUser(email);
        return loginAndExtractAccessToken(email, "Password123");
    }

    protected String registerVerifiedUser(String email) {
        register(email, "Password123");
        String code = latestVerificationCodeFor(email);
        ResponseEntity<Map> response = verifyEmailCode(email, code);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Email verification failed: " + response.getBody());
        }
        return email;
    }

    protected UUID userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    // ---------------------------------------------------------------- universities

    protected UUID insertVerifiedUniversity(String name) {
        UUID universityId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO universities (id, name, slug, city, status, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, 'VERIFIED', now(), now())",
                universityId, name, "univ-" + universityId, "Mogadishu");
        return universityId;
    }

    protected UUID insertDepartment(UUID universityId, String name, String code) {
        UUID departmentId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO departments (id, university_id, name, code, created_at) VALUES (?, ?, ?, ?, now())",
                departmentId, universityId, name, code);
        return departmentId;
    }

    /** Assigns university staff; {@code departmentIds} scopes a coordinator (ignored for admins). */
    protected UUID insertUniversityMembership(UUID universityId, UUID userId, String role, List<UUID> departmentIds) {
        UUID membershipId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO university_memberships (id, university_id, user_id, role, assigned_at) "
                        + "VALUES (?, ?, ?, ?, now())",
                membershipId, universityId, userId, role);
        for (UUID departmentId : departmentIds) {
            jdbcTemplate.update(
                    "INSERT INTO university_membership_departments (id, membership_id, department_id, assigned_at) "
                            + "VALUES (?, ?, ?, now())",
                    UUID.randomUUID(), membershipId, departmentId);
        }
        return membershipId;
    }

    // ---------------------------------------------------------------- students

    /**
     * Creates a student account with a VERIFIED enrollment — the normal precondition for taking part
     * in recruitment at all (CLAUDE.md section 27).
     */
    protected StudentFixture createVerifiedStudent(String prefix, UUID universityId, UUID departmentId) {
        return createStudent(prefix, universityId, departmentId, "VERIFIED");
    }

    protected StudentFixture createStudent(String prefix, UUID universityId, UUID departmentId, String verificationStatus) {
        String email = uniqueEmail(prefix);
        registerVerifiedUser(email);
        String accessToken = loginAndExtractAccessToken(email, "Password123");
        UUID userId = userIdOf(email);

        authorizedPut("/api/v1/students/me/profile", accessToken,
                Map.of("fullName", "Student " + prefix, "phone", "+252612345678"));

        UUID enrollmentId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO student_enrollments (id, student_user_id, university_id, department_id, student_number, "
                        + "program, academic_year, verification_status, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())",
                enrollmentId, userId, universityId, departmentId, "SN-" + UUID.randomUUID().toString().substring(0, 8),
                "Computer Science", "2026", verificationStatus);

        return new StudentFixture(email, userId, accessToken, enrollmentId);
    }

    public record StudentFixture(String email, UUID userId, String accessToken, UUID enrollmentId) {
    }

    protected ResponseEntity<Map> authorizedPut(String path, String accessToken, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), HttpMethod.PUT, new HttpEntity<>(body, headers), Map.class);
    }

    // ---------------------------------------------------------------- organizations

    protected UUID createVerifiedOrganization(String accessToken, String name) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations", accessToken,
                Map.of("name", name, "type", "COMPANY"));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException(
                    "Organization creation failed: " + response.getStatusCode() + " " + response.getBody());
        }
        UUID organizationId = UUID.fromString((String) response.getBody().get("id"));
        jdbcTemplate.update(
                "UPDATE organizations SET verification_status = 'VERIFIED', verified_at = now() WHERE id = ?",
                organizationId);
        return organizationId;
    }

    protected UUID insertOrganizationMembership(UUID organizationId, UUID userId, String role) {
        UUID membershipId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO organization_memberships (id, organization_id, user_id, role, assigned_at) "
                        + "VALUES (?, ?, ?, ?, now())",
                membershipId, organizationId, userId, role);
        return membershipId;
    }

    // ---------------------------------------------------------------- opportunities

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
                "/api/v1/organizations/" + organizationId + "/opportunities", accessToken,
                draftOpportunityBody(mode, overrides));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Opportunity creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    protected void publishOpportunity(String accessToken, UUID opportunityId) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", accessToken, null);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Publish failed: " + response.getBody());
        }
    }

    protected UUID addTarget(
            String accessToken, UUID opportunityId, UUID universityId, List<UUID> departmentIds, int requestedNominees) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("universityId", universityId.toString());
        body.put("departmentIds", departmentIds.stream().map(UUID::toString).toList());
        body.put("requestedNominees", requestedNominees);
        body.put("nominationDeadline", LocalDate.now().plusWeeks(3).toString());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/targets", accessToken, body);
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Target creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    /**
     * A published PUBLIC opportunity owned by a verified organization whose founder is an
     * ORGANIZATION_ADMIN — the most common starting point for these tests.
     */
    protected PublishedOpportunity publishPublicOpportunity(String recruiterEmailPrefix) {
        String recruiterToken = registerVerifiedAndLogin(recruiterEmailPrefix);
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiterToken, opportunityId);
        return new PublishedOpportunity(recruiterToken, organizationId, opportunityId);
    }

    public record PublishedOpportunity(String recruiterToken, UUID organizationId, UUID opportunityId) {
    }

    // ---------------------------------------------------------------- assertions/helpers

    protected String errorCode(ResponseEntity<Map> response) {
        return response.getBody() == null ? null : (String) response.getBody().get("code");
    }

    protected int countPlacementsForStudent(UUID studentUserId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placements WHERE student_user_id = ?", Integer.class, studentUserId);
        return count == null ? 0 : count;
    }

    protected int countCandidacies(UUID opportunityId, UUID studentUserId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM candidacies WHERE opportunity_id = ? AND student_user_id = ?",
                Integer.class, opportunityId, studentUserId);
        return count == null ? 0 : count;
    }

    /** Forces an offer past its response deadline without waiting, for expiry tests. */
    protected void expireOfferDeadline(UUID offerId) {
        jdbcTemplate.update(
                "UPDATE internship_offers SET response_deadline = current_date - 1 WHERE id = ?", offerId);
    }
}
