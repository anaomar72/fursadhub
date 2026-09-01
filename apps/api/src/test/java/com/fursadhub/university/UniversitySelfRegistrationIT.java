package com.fursadhub.university;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * University self-registration and its license-verification gate (Phase 7.5; CLAUDE.md sections 25,
 * 31, 47-48).
 *
 * <p>Two things are being proved here. First, that the whole path works end to end through the real
 * endpoints — register, attach the license, submit, a platform reviewer verifies — and that reaching
 * VERIFIED is what actually admits the university to the recruitment pipeline, since an opportunity
 * cannot target an unverified one. Second, that the private license document is reachable only by
 * that university's own staff and a platform reviewer, and by nobody else regardless of what id they
 * put in the URL (CLAUDE.md section 60 — institution isolation and private-file access).
 */
class UniversitySelfRegistrationIT extends AbstractPhase7IT {

    @Test
    @DisplayName("Register, attach a license, submit, get verified — and only then be targetable")
    void registrationThroughVerificationMakesTheUniversityTargetable() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-founder"));
        UUID founderUserId = currentUserId(founderToken);
        UUID universityId = createUniversity(founderToken, "Benadir University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS-" + shortId());

        assertThat(universityStatus(universityId)).isEqualTo("DRAFT");

        // An organization cannot target it yet — this is the consequence verification actually has.
        String recruiterToken = registerVerifiedAndLogin(emailPrefix("uni-recruiter"));
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "UNIVERSITY_TARGETED", Map.of());

        ResponseEntity<Map> tooEarly = addTargetAttempt(recruiterToken, opportunityId, universityId, departmentId);
        assertThat(tooEarly.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(tooEarly)).isEqualTo("TARGET_UNIVERSITY_NOT_VERIFIED");

        requireOk(uploadUniversityEvidence(founderToken, universityId), "Upload license");
        ResponseEntity<Map> submitted = authorizedPost(
                "/api/v1/universities/" + universityId + "/verification/submit", founderToken, null);
        requireOk(submitted, "Submit for verification");
        assertThat(submitted.getBody().get("status")).isEqualTo("SUBMITTED");

        Staff officer = verificationOfficer(emailPrefix("uni-officer"));
        requireOk(authorizedPost("/api/v1/admin/universities/" + universityId + "/begin-review",
                officer.token(), null), "Begin review");
        ResponseEntity<Map> verified = authorizedPost(
                "/api/v1/admin/universities/" + universityId + "/verify", officer.token(), null);
        requireOk(verified, "Verify");

        assertThat(verified.getBody().get("verificationStatus")).isEqualTo("VERIFIED");
        assertThat(verified.getBody().get("verifiedAt")).isNotNull();
        assertThat(countAuditEvents("UNIVERSITY_VERIFIED")).isGreaterThanOrEqualTo(1);
        assertThat(countNotifications(founderUserId, "UNIVERSITY_VERIFIED")).isEqualTo(1);

        ResponseEntity<Map> targeted = addTargetAttempt(recruiterToken, opportunityId, universityId, departmentId);
        assertThat(targeted.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("A university cannot be submitted for review with no license attached")
    void submitWithoutEvidenceIsRefused() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-noevidence"));
        UUID universityId = createUniversity(founderToken, "Empty University " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + universityId + "/verification/submit", founderToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("UNIVERSITY_VERIFICATION_EVIDENCE_REQUIRED");
        assertThat(universityStatus(universityId)).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("A university admin cannot upload to, or read the license of, another university")
    void crossUniversityEvidenceAccessIsDenied() {
        String adminA = registerVerifiedAndLogin(emailPrefix("uni-a-admin"));
        UUID universityA = createUniversity(adminA, "University A " + UUID.randomUUID());
        requireOk(uploadUniversityEvidence(adminA, universityA), "Upload A's license");

        String adminB = registerVerifiedAndLogin(emailPrefix("uni-b-admin"));
        UUID universityB = createUniversity(adminB, "University B " + UUID.randomUUID());
        requireOk(uploadUniversityEvidence(adminB, universityB), "Upload B's license");

        assertThat(uploadUniversityEvidence(adminA, universityB).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(downloadEvidence(universityB, adminA).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        // The same call against their OWN university still works, so the refusal is about scope
        // rather than a route that is broken for everyone.
        assertThat(downloadEvidence(universityA, adminA).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("A student has no route to a university's license document")
    void studentCannotReadUniversityEvidence() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-priv-founder"));
        UUID universityId = createUniversity(founderToken, "Private University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS-" + shortId());
        requireOk(uploadUniversityEvidence(founderToken, universityId), "Upload license");

        StudentFixture student = createVerifiedStudent(emailPrefix("uni-priv-student"), universityId, departmentId);

        // Enrolled AT this university and still refused: reading it needs a staff membership,
        // which studying there is not.
        assertThat(downloadEvidence(universityId, student.accessToken()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("A platform reviewer can read the license they are deciding on")
    void platformReviewerCanReadEvidence() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-rev-founder"));
        UUID universityId = createUniversity(founderToken, "Reviewed University " + UUID.randomUUID());
        requireOk(uploadUniversityEvidence(founderToken, universityId), "Upload license");
        requireOk(authorizedPost("/api/v1/universities/" + universityId + "/verification/submit",
                founderToken, null), "Submit for verification");

        Staff officer = verificationOfficer(emailPrefix("uni-rev-officer"));
        ResponseEntity<byte[]> document = downloadDocument(
                "/api/v1/admin/universities/" + universityId + "/verification/evidence/document", officer.token());

        assertThat(document.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(document.getBody()).isEqualTo(validPdfBytes());
        assertThat(countAuditEvents("PRIVATE_FILE_ACCESSED")).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Uploading the license is admin-only; reading it back is any staff member")
    void coordinatorMayReadButNotUploadTheLicense() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-coord-founder"));
        UUID universityId = createUniversity(founderToken, "Scoped University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Business", "BA-" + shortId());
        requireOk(uploadUniversityEvidence(founderToken, universityId), "Upload license");

        String coordinatorEmail = uniqueEmail(emailPrefix("uni-coordinator"));
        registerVerifiedUser(coordinatorEmail);
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");
        insertUniversityMembership(
                universityId, userIdOf(coordinatorEmail), "DEPARTMENT_COORDINATOR", List.of(departmentId));

        assertThat(downloadEvidence(universityId, coordinatorToken).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(uploadUniversityEvidence(coordinatorToken, universityId).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("An invalid review transition is refused by the domain, not silently applied")
    void invalidReviewTransitionIsRefused() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-invalid"));
        UUID universityId = createUniversity(founderToken, "Invalid University " + UUID.randomUUID());
        requireOk(uploadUniversityEvidence(founderToken, universityId), "Upload license");
        requireOk(authorizedPost("/api/v1/universities/" + universityId + "/verification/submit",
                founderToken, null), "Submit for verification");

        Staff officer = verificationOfficer(emailPrefix("uni-invalid-off"));

        // SUBMITTED -> NEEDS_CHANGES is not a legal move: requestChanges requires UNDER_REVIEW.
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/universities/" + universityId + "/request-changes", officer.token(),
                Map.of("note", "Please attach the accreditation certificate."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(universityStatus(universityId)).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("A university admin cannot verify their own university")
    void selfVerificationIsRefused() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-self"));
        UUID universityId = createUniversity(founderToken, "Self University " + UUID.randomUUID());
        requireOk(uploadUniversityEvidence(founderToken, universityId), "Upload license");
        requireOk(authorizedPost("/api/v1/universities/" + universityId + "/verification/submit",
                founderToken, null), "Submit for verification");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/universities/" + universityId + "/verify", founderToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(universityStatus(universityId)).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("The review queue can be filtered to universities awaiting review")
    void queueFiltersBySubmittedStatus() {
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-queue"));
        UUID universityId = createUniversity(founderToken, "Queued University " + UUID.randomUUID());
        requireOk(uploadUniversityEvidence(founderToken, universityId), "Upload license");
        requireOk(authorizedPost("/api/v1/universities/" + universityId + "/verification/submit",
                founderToken, null), "Submit for verification");

        Staff officer = verificationOfficer(emailPrefix("uni-queue-off"));
        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/admin/universities?status=SUBMITTED", officer.token());
        requireOk(response, "Queue");

        List<?> content = (List<?>) response.getBody().get("content");
        assertThat(content).isNotEmpty();
        assertThat(content).allSatisfy(entry ->
                assertThat(((Map<?, ?>) entry).get("verificationStatus")).isEqualTo("SUBMITTED"));
        assertThat(content).anySatisfy(entry ->
                assertThat(((Map<?, ?>) entry).get("id")).isEqualTo(universityId.toString()));
    }

    @Test
    @DisplayName("The management detail endpoint returns full detail for a member and refuses everyone else")
    void managementDetailIsMemberOnly() {
        // Found by manual browser verification, not by this suite: UniversityController never had a
        // GET /{universityId} route at all — UniversityQueryService.getUniversity() and
        // UniversityDetailResponse both existed, but nothing wired them to an endpoint, so
        // UniversityProfilePage's own detail fetch 500'd. Every other test in this class checks state
        // via a direct JDBC query instead of this endpoint, which is exactly how the gap stayed
        // invisible to the suite.
        String founderToken = registerVerifiedAndLogin(emailPrefix("uni-detail-founder"));
        UUID universityId = createUniversity(founderToken, "Detail University " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedGet("/api/v1/universities/" + universityId, founderToken);
        requireOk(response, "Get university detail");
        assertThat(response.getBody().get("id")).isEqualTo(universityId.toString());
        assertThat(response.getBody().get("status")).isEqualTo("DRAFT");
        assertThat(response.getBody().get("hasEvidence")).isEqualTo(false);
        assertThat(response.getBody().get("hasLogo")).isEqualTo(false);

        String outsiderToken = registerVerifiedAndLogin(emailPrefix("uni-detail-outsider"));
        assertThat(authorizedGet("/api/v1/universities/" + universityId, outsiderToken).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Creating a department is admin-only, rejects a duplicate code, and the department is then usable")
    void departmentCreationIsAdminOnlyAndCodeIsUnique() {
        String adminToken = registerVerifiedAndLogin(emailPrefix("uni-dept-admin"));
        UUID universityId = createUniversity(adminToken, "Department University " + UUID.randomUUID());

        ResponseEntity<Map> created = authorizedPost("/api/v1/universities/" + universityId + "/departments",
                adminToken, Map.of("name", "Computer Science", "code", "CS"));
        requireOk(created, "Create department");
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody().get("name")).isEqualTo("Computer Science");

        ResponseEntity<Map> duplicate = authorizedPost("/api/v1/universities/" + universityId + "/departments",
                adminToken, Map.of("name", "Comp Sci Again", "code", "CS"));
        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(duplicate)).isEqualTo("DEPARTMENT_CODE_ALREADY_EXISTS");

        String coordinatorEmail = uniqueEmail(emailPrefix("uni-dept-coordinator"));
        registerVerifiedUser(coordinatorEmail);
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");
        UUID departmentId = UUID.fromString((String) created.getBody().get("id"));
        insertUniversityMembership(
                universityId, userIdOf(coordinatorEmail), "DEPARTMENT_COORDINATOR", List.of(departmentId));

        ResponseEntity<Map> deniedCreate = authorizedPost("/api/v1/universities/" + universityId + "/departments",
                coordinatorToken, Map.of("name", "Engineering", "code", "ENG"));
        assertThat(deniedCreate.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("A department's own coordinator can rename it; a coordinator scoped elsewhere cannot")
    void departmentRenameIsScopedToTheAssignedCoordinator() {
        String adminToken = registerVerifiedAndLogin(emailPrefix("uni-rename-admin"));
        UUID universityId = createUniversity(adminToken, "Rename University " + UUID.randomUUID());
        ResponseEntity<Map> cs = authorizedPost("/api/v1/universities/" + universityId + "/departments",
                adminToken, Map.of("name", "Computer Science", "code", "CS"));
        UUID csId = UUID.fromString((String) cs.getBody().get("id"));
        ResponseEntity<Map> business = authorizedPost("/api/v1/universities/" + universityId + "/departments",
                adminToken, Map.of("name", "Business", "code", "BA"));
        UUID businessId = UUID.fromString((String) business.getBody().get("id"));

        String csCoordinatorEmail = uniqueEmail(emailPrefix("uni-rename-cs-coord"));
        registerVerifiedUser(csCoordinatorEmail);
        String csCoordinatorToken = loginAndExtractAccessToken(csCoordinatorEmail, "Password123");
        insertUniversityMembership(
                universityId, userIdOf(csCoordinatorEmail), "DEPARTMENT_COORDINATOR", List.of(csId));

        ResponseEntity<Map> renamed = authorizedPatch(
                "/api/v1/universities/" + universityId + "/departments/" + csId,
                csCoordinatorToken, Map.of("name", "Computer & Data Science"));
        requireOk(renamed, "Rename own department");
        assertThat(renamed.getBody().get("name")).isEqualTo("Computer & Data Science");

        ResponseEntity<Map> deniedRename = authorizedPatch(
                "/api/v1/universities/" + universityId + "/departments/" + businessId,
                csCoordinatorToken, Map.of("name", "Renamed Business"));
        assertThat(deniedRename.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- fixtures

    private UUID createUniversity(String accessToken, String name) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/universities", accessToken,
                Map.of("name", name, "city", "Mogadishu", "registrationNumber", "UNI-REG-" + shortId()));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("University creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    private ResponseEntity<Map> uploadUniversityEvidence(String accessToken, UUID universityId) {
        return multipartPost("/api/v1/universities/" + universityId + "/verification/evidence",
                accessToken, "license.pdf", "application/pdf", validPdfBytes());
    }

    private ResponseEntity<byte[]> downloadEvidence(UUID universityId, String accessToken) {
        return downloadDocument(
                "/api/v1/universities/" + universityId + "/verification/evidence/document", accessToken);
    }

    private ResponseEntity<Map> addTargetAttempt(
            String accessToken, UUID opportunityId, UUID universityId, UUID departmentId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("universityId", universityId.toString());
        body.put("departmentIds", List.of(departmentId.toString()));
        body.put("requestedNominees", 5);
        body.put("nominationDeadline", LocalDate.now().plusWeeks(3).toString());
        return authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", accessToken, body);
    }

    private String universityStatus(UUID universityId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM universities WHERE id = ?", String.class, universityId);
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    /** Not inherited: {@code authorizedPatch} lives on {@code AbstractPhase3IT}, a sibling branch this class does not extend. */
    private ResponseEntity<Map> authorizedPatch(String path, String accessToken, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), HttpMethod.PATCH, new HttpEntity<>(body, headers), Map.class);
    }
}
