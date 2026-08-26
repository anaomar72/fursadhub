package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The private-file boundary for the two document types Phase 7 adds — the student's CV and
 * university verification evidence (CLAUDE.md sections 31, 47-48, 60).
 *
 * <p>These are the mandatory section 60 tests for files: a student cannot download another student's
 * private file, and a recruiter cannot reach verification evidence. Both are asserted against real
 * uploads through real endpoints, because a rule that only holds in a unit test's imagination is not
 * a boundary.
 */
class PrivateFileAccessIT extends AbstractPhase7IT {

    // ---------------------------------------------------------------- CV

    @Test
    @DisplayName("A student uploads and downloads their own CV")
    void studentOwnsTheirCv() {
        UUID universityId = insertVerifiedUniversity("CV University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("cv-owner", universityId, departmentId);

        requireOk(uploadCv(student.accessToken(), "cv.pdf", "application/pdf", validPdfBytes()), "Upload CV");

        ResponseEntity<byte[]> download =
                downloadDocument("/api/v1/students/me/cv/document", student.accessToken());

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(download.getBody()).isEqualTo(validPdfBytes());
    }

    @Test
    @DisplayName("A CV download is an attachment and is never cached")
    void cvDownloadCarriesSafeHeaders() {
        UUID universityId = insertVerifiedUniversity("Header University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("cv-headers", universityId, departmentId);
        requireOk(uploadCv(student.accessToken(), "cv.pdf", "application/pdf", validPdfBytes()), "Upload CV");

        ResponseEntity<byte[]> download =
                downloadDocument("/api/v1/students/me/cv/document", student.accessToken());
        HttpHeaders headers = download.getHeaders();

        assertThat(headers.getFirst(HttpHeaders.CONTENT_DISPOSITION)).startsWith("attachment");
        assertThat(headers.getFirst(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        assertThat(headers.getContentType().toString()).isEqualTo("application/pdf");
    }

    @Test
    @DisplayName("Student A cannot reach Student B's CV through any route")
    void studentCannotReadAnotherStudentsCv() {
        UUID universityId = insertVerifiedUniversity("Isolation University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture owner = createVerifiedStudent("cv-a", universityId, departmentId);
        StudentFixture other = createVerifiedStudent("cv-b", universityId, departmentId);

        requireOk(uploadCv(owner.accessToken(), "cv.pdf", "application/pdf", validPdfBytes()), "Upload CV");

        // The only self-service route is /students/me/cv, which resolves the profile from the JWT.
        // Student B calling it gets their OWN (absent) CV, never A's — there is no route that takes a
        // student id at all, which is the design that makes this impossible rather than merely denied.
        ResponseEntity<byte[]> attempt =
                downloadDocument("/api/v1/students/me/cv/document", other.accessToken());

        assertThat(attempt.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("A recruiter reads a candidate's CV only through their own organization's candidacy")
    void recruiterReadsCvThroughCandidacyOnly() {
        PublishedOpportunity opportunity = publishPublicOpportunity("cv-recruiter");
        UUID universityId = insertVerifiedUniversity("Applicant University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("cv-applicant", universityId, departmentId);

        requireOk(uploadCv(student.accessToken(), "cv.pdf", "application/pdf", validPdfBytes()), "Upload CV");

        ResponseEntity<Map> application = authorizedPost(
                "/api/v1/opportunities/" + opportunity.opportunityId() + "/applications",
                student.accessToken(), Map.of("answers", List.of()));
        requireOk(application, "Apply");
        UUID candidacyId = UUID.fromString((String) application.getBody().get("id"));

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/candidacies/" + candidacyId + "/cv", opportunity.recruiterToken());

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(download.getBody()).isEqualTo(validPdfBytes());
    }

    @Test
    @DisplayName("A recruiter at another organization cannot read that candidate's CV")
    void otherOrganizationRecruiterIsRefused() {
        PublishedOpportunity opportunity = publishPublicOpportunity("cv-org-a");
        PublishedOpportunity otherOrganization = publishPublicOpportunity("cv-org-b");

        UUID universityId = insertVerifiedUniversity("Cross Org University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("cv-cross", universityId, departmentId);
        requireOk(uploadCv(student.accessToken(), "cv.pdf", "application/pdf", validPdfBytes()), "Upload CV");

        ResponseEntity<Map> application = authorizedPost(
                "/api/v1/opportunities/" + opportunity.opportunityId() + "/applications",
                student.accessToken(), Map.of("answers", List.of()));
        requireOk(application, "Apply");
        UUID candidacyId = UUID.fromString((String) application.getBody().get("id"));

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/candidacies/" + candidacyId + "/cv", otherOrganization.recruiterToken());

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("A non-PDF CV is rejected with a machine-readable code")
    void cvMustBePdf() {
        UUID universityId = insertVerifiedUniversity("Mime University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("cv-mime", universityId, departmentId);

        ResponseEntity<Map> response = uploadCv(
                student.accessToken(), "cv.png", "image/png", validPngBytes());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("CV_FILE_INVALID");
    }

    @Test
    @DisplayName("A file renamed to .pdf is rejected on its content, not its name")
    void cvContentMustMatchItsClaimedType() {
        UUID universityId = insertVerifiedUniversity("Magic University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("cv-magic", universityId, departmentId);

        ResponseEntity<Map> response = uploadCv(student.accessToken(), "cv.pdf", "application/pdf",
                "MZ this is an executable".getBytes(StandardCharsets.UTF_8));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("CV_FILE_INVALID");
    }

    // ---------------------------------------------------------------- verification evidence

    @Test
    @DisplayName("A student uploads evidence and a scoped university reviewer can read it")
    void scopedReviewerReadsEvidence() {
        UUID universityId = insertVerifiedUniversity("Evidence University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = studentWithSubmittedCase("ev-student", universityId, departmentId);
        Staff coordinator = universityStaff(
                "ev-coord", universityId, "DEPARTMENT_COORDINATOR", List.of(departmentId));

        requireOk(uploadEvidence(student.accessToken(), "card.png", "image/png", validPngBytes()),
                "Upload evidence");
        UUID caseId = myVerificationCaseId(student.accessToken());

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/universities/" + universityId + "/verification-cases/" + caseId + "/evidence/document",
                coordinator.token());

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(download.getBody()).isEqualTo(validPngBytes());
    }

    @Test
    @DisplayName("A coordinator from another department cannot read that evidence")
    void departmentScopeAppliesToEvidence() {
        UUID universityId = insertVerifiedUniversity("Dept Scope University");
        UUID ownDepartment = insertDepartment(universityId, "Computing", "CS");
        UUID otherDepartment = insertDepartment(universityId, "Business", "BUS");

        StudentFixture student = studentWithSubmittedCase("ev-scoped", universityId, ownDepartment);
        Staff outsider = universityStaff(
                "ev-outsider", universityId, "DEPARTMENT_COORDINATOR", List.of(otherDepartment));

        requireOk(uploadEvidence(student.accessToken(), "card.png", "image/png", validPngBytes()),
                "Upload evidence");
        UUID caseId = myVerificationCaseId(student.accessToken());

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/universities/" + universityId + "/verification-cases/" + caseId + "/evidence/document",
                outsider.token());

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("University B cannot read University A's verification evidence")
    void universityIsolationAppliesToEvidence() {
        UUID universityA = insertVerifiedUniversity("Evidence A");
        UUID departmentA = insertDepartment(universityA, "Computing", "CS");
        UUID universityB = insertVerifiedUniversity("Evidence B");

        StudentFixture student = studentWithSubmittedCase("ev-uni-a", universityA, departmentA);
        Staff intruder = universityStaff("ev-uni-b", universityB, "UNIVERSITY_ADMIN", List.of());

        requireOk(uploadEvidence(student.accessToken(), "card.png", "image/png", validPngBytes()),
                "Upload evidence");
        UUID caseId = myVerificationCaseId(student.accessToken());

        // Both the honest path (their own university id) and the tampered one (A's id) must fail.
        assertThat(downloadDocument(
                "/api/v1/universities/" + universityB + "/verification-cases/" + caseId + "/evidence/document",
                intruder.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(downloadDocument(
                "/api/v1/universities/" + universityA + "/verification-cases/" + caseId + "/evidence/document",
                intruder.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("A recruiter cannot reach verification evidence — CLAUDE.md section 60")
    void recruiterCannotReachVerificationEvidence() {
        UUID universityId = insertVerifiedUniversity("Recruiter Blocked University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = studentWithSubmittedCase("ev-vs-recruiter", universityId, departmentId);
        PublishedOpportunity opportunity = publishPublicOpportunity("ev-recruiter");

        requireOk(uploadEvidence(student.accessToken(), "card.png", "image/png", validPngBytes()),
                "Upload evidence");
        UUID caseId = myVerificationCaseId(student.accessToken());

        // A recruiter has NO route to verification evidence, whatever their relationship to the
        // student: it is not exposed on the candidacy, the university route refuses a non-member, and
        // the platform route refuses a non-admin. (A candidacy is not set up here because a student
        // whose case is still open is by definition not verified and cannot apply — which is itself
        // the Phase 4 rule, and means the recruiter has even less standing than this test assumes.)
        assertThat(downloadDocument(
                "/api/v1/universities/" + universityId + "/verification-cases/" + caseId + "/evidence/document",
                opportunity.recruiterToken()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(downloadDocument(
                "/api/v1/admin/verification-escalations/" + caseId + "/evidence/document",
                opportunity.recruiterToken()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Evidence accepts PDF and images but not an arbitrary type")
    void evidenceMimePolicy() {
        UUID universityId = insertVerifiedUniversity("Evidence Mime University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = studentWithSubmittedCase("ev-mime", universityId, departmentId);

        requireOk(uploadEvidence(student.accessToken(), "card.pdf", "application/pdf", validPdfBytes()),
                "PDF evidence");
        requireOk(uploadEvidence(student.accessToken(), "card.png", "image/png", validPngBytes()),
                "PNG evidence");

        ResponseEntity<Map> rejected = uploadEvidence(
                student.accessToken(), "card.zip", "application/zip",
                "PK".getBytes(StandardCharsets.UTF_8));

        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(rejected)).isEqualTo("EVIDENCE_FILE_INVALID");
    }

    @Test
    @DisplayName("Every private read is audited")
    void privateReadsAreAudited() {
        UUID universityId = insertVerifiedUniversity("Audited University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("audited-cv", universityId, departmentId);
        requireOk(uploadCv(student.accessToken(), "cv.pdf", "application/pdf", validPdfBytes()), "Upload CV");

        int before = countAuditEvents("PRIVATE_FILE_ACCESSED");
        requireOk(downloadDocument("/api/v1/students/me/cv/document", student.accessToken()), "Download CV");

        assertThat(countAuditEvents("PRIVATE_FILE_ACCESSED")).isEqualTo(before + 1);
    }

    @Test
    @DisplayName("No API response ever exposes a storage key")
    void storageKeysAreNeverExposed() {
        UUID universityId = insertVerifiedUniversity("Key University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("key-cv", universityId, departmentId);

        ResponseEntity<Map> upload =
                uploadCv(student.accessToken(), "cv.pdf", "application/pdf", validPdfBytes());
        requireOk(upload, "Upload CV");

        String storageKey = jdbcTemplate.queryForObject(
                "SELECT storage_key FROM stored_files WHERE uploaded_by = ?", String.class, student.userId());

        assertThat(storageKey).isNotBlank();
        assertThat(upload.getBody().toString()).doesNotContain(storageKey);
        assertThat(authorizedGet("/api/v1/students/me/cv", student.accessToken()).getBody().toString())
                .doesNotContain(storageKey);
    }
}
