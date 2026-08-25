package com.fursadhub.placement;

import com.fursadhub.candidacy.AbstractPhase4IT;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Shared fixtures for Phase 5 (placement lifecycle and supervisors) integration tests.
 *
 * <p>Placements are NEVER inserted directly with SQL here. Every fixture drives the real Phase 4
 * flow — publish, apply, offer, accept — so the placement under test is created by the same
 * transaction production uses, with the same academic context, the same {@code UNIQUE(candidacy_id)}
 * guarantee, and the same derived student availability. A SQL shortcut would let these tests pass
 * against a placement shape production can never actually produce.
 *
 * <p>Staff memberships still drop to SQL, exactly as Phase 4 does, because no endpoint assigns them
 * yet. Authorization itself is always exercised over real HTTP.
 */
public abstract class AbstractPhase5IT extends AbstractPhase4IT {

    /**
     * Longest email prefix that still leaves room for the 36-character UUID {@code uniqueEmail}
     * appends. RFC 5321 caps an address's local part at 64 characters and Bean Validation's
     * {@code @Email} enforces it, so a descriptive-but-long prefix would otherwise produce an
     * address the real registration endpoint rejects — a fixture bug that looks like a product bug.
     */
    private static final int MAX_EMAIL_PREFIX = 27;

    /**
     * Caps a descriptive prefix to a length that always yields a valid address. Uniqueness comes
     * from the appended UUID, never from the prefix, so truncation is safe.
     */
    protected static String emailPrefix(String prefix) {
        return prefix.length() <= MAX_EMAIL_PREFIX ? prefix : prefix.substring(0, MAX_EMAIL_PREFIX);
    }

    /**
     * A complete placement and everyone attached to it. Every token here is a real logged-in
     * account, so a test can act as any party without fabricating credentials.
     */
    public record PlacementFixture(
            UUID placementId,
            UUID candidacyId,
            UUID opportunityId,
            UUID organizationId,
            UUID universityId,
            UUID departmentId,
            StudentFixture student,
            String recruiterToken,
            UUID recruiterUserId) {
    }

    /**
     * Builds a PLANNED placement end to end: a verified organization publishes a PUBLIC opportunity,
     * a verified student applies, the recruiter offers, and the student accepts — which is the one
     * and only way a placement comes into existence.
     */
    protected PlacementFixture createPlacement(String prefix) {
        String recruiterToken = registerVerifiedAndLogin(emailPrefix(prefix + "-recruiter"));
        UUID recruiterUserId = currentUserId(recruiterToken);
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiterToken, opportunityId);

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS-" + shortId());
        StudentFixture student = createVerifiedStudent(emailPrefix(prefix + "-student"), universityId, departmentId);

        ResponseEntity<Map> applied = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/applications", student.accessToken(), Map.of());
        requireSuccess(applied, "Application");
        UUID candidacyId = UUID.fromString((String) applied.getBody().get("id"));

        ResponseEntity<Map> offered = authorizedPost(
                "/api/v1/candidacies/" + candidacyId + "/offer", recruiterToken,
                Map.of(
                        "startDate", LocalDate.now().plusMonths(2).toString(),
                        "endDate", LocalDate.now().plusMonths(5).toString(),
                        "responseDeadline", LocalDate.now().plusWeeks(2).toString(),
                        "location", "Mogadishu",
                        "details", "Full-time internship."));
        requireSuccess(offered, "Offer");
        UUID offerId = UUID.fromString((String) offered.getBody().get("id"));

        ResponseEntity<Map> accepted = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", student.accessToken(), null);
        requireSuccess(accepted, "Offer acceptance");

        Map<String, Object> placement = (Map<String, Object>) accepted.getBody().get("placement");
        UUID placementId = UUID.fromString((String) placement.get("id"));

        return new PlacementFixture(
                placementId, candidacyId, opportunityId, organizationId, universityId, departmentId,
                student, recruiterToken, recruiterUserId);
    }

    // ---------------------------------------------------------------- staff fixtures

    /** A logged-in university staff member at {@code universityId}, optionally department-scoped. */
    protected Staff universityStaff(String prefix, UUID universityId, String role, List<UUID> departmentIds) {
        String email = uniqueEmail(emailPrefix(prefix));
        registerVerifiedUser(email);
        String token = loginAndExtractAccessToken(email, "Password123");
        UUID userId = userIdOf(email);
        insertUniversityMembership(universityId, userId, role, departmentIds);
        return new Staff(email, userId, token);
    }

    /** A logged-in organization staff member at {@code organizationId}. */
    protected Staff organizationStaff(String prefix, UUID organizationId, String role) {
        String email = uniqueEmail(emailPrefix(prefix));
        registerVerifiedUser(email);
        String token = loginAndExtractAccessToken(email, "Password123");
        UUID userId = userIdOf(email);
        insertOrganizationMembership(organizationId, userId, role);
        return new Staff(email, userId, token);
    }

    public record Staff(String email, UUID userId, String token) {
    }

    // ---------------------------------------------------------------- helpers

    protected String placementStatus(UUID placementId) {
        return jdbcTemplate.queryForObject("SELECT status FROM placements WHERE id = ?", String.class, placementId);
    }

    /** Active assignments of one type — the invariant behind "at most one supervisor per post". */
    protected int countActiveAssignments(UUID placementId, String type) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placement_supervisor_assignments "
                        + "WHERE placement_id = ? AND type = ? AND removed_at IS NULL",
                Integer.class, placementId, type);
        return count == null ? 0 : count;
    }

    /** Every assignment row ever written for a placement, closed ones included. */
    protected int countAllAssignments(UUID placementId, String type) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placement_supervisor_assignments WHERE placement_id = ? AND type = ?",
                Integer.class, placementId, type);
        return count == null ? 0 : count;
    }

    protected int countAuditEvents(String eventType) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_events WHERE event_type = ?", Integer.class, eventType);
        return count == null ? 0 : count;
    }

    /** Drives the placement to ACTIVE through the real endpoint, for tests that start from there. */
    protected void startPlacement(PlacementFixture fixture) {
        requireSuccess(
                authorizedPost("/api/v1/placements/" + fixture.placementId() + "/start", fixture.recruiterToken(), null),
                "Start");
    }

    protected ResponseEntity<Map> authorizedDelete(String path, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url(path), HttpMethod.DELETE, new HttpEntity<>(headers), Map.class);
    }

    private void requireSuccess(ResponseEntity<Map> response, String what) {
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException(what + " failed: " + response.getStatusCode() + " " + response.getBody());
        }
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    /** The user id behind a token, read back through {@code /me} rather than decoded client-side. */
    protected UUID currentUserId(String accessToken) {
        ResponseEntity<Map> me = authorizedGet("/api/v1/me", accessToken);
        if (!me.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Could not resolve current user: " + me.getBody());
        }
        return UUID.fromString((String) me.getBody().get("id"));
    }
}
