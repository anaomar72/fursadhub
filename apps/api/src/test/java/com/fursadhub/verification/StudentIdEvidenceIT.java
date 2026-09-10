package com.fursadhub.verification;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class StudentIdEvidenceIT extends AbstractPhase7IT {
    private static final String SUBMIT = "/api/v1/students/me/enrollment/submit-verification";

    @Test void missingEvidenceDoesNotCreateCaseOrAdvanceEnrollment() {
        UUID university = insertVerifiedUniversity("ID gate");
        UUID department = insertDepartment(university, "Computing", "CS");
        var student = createStudent("id-gate", university, department, "DRAFT");
        var response = authorizedPost(SUBMIT, student.accessToken(), null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("STUDENT_ID_EVIDENCE_REQUIRED");
        assertThat(authorizedGet("/api/v1/students/me/enrollment", student.accessToken()).getBody().get("verificationStatus")).isEqualTo("DRAFT");
        assertThat(authorizedGet("/api/v1/students/me/verification", student.accessToken()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test void draftUploadIsPrivateAndSubmissionMovesItToScopedReview() {
        UUID university = insertVerifiedUniversity("ID review");
        UUID department = insertDepartment(university, "Computing", "CS");
        UUID otherDepartment = insertDepartment(university, "Business", "BA");
        var student = createStudent("id-review", university, department, "DRAFT");
        requireOk(uploadEvidence(student.accessToken(), "student-id.pdf", "application/pdf", validPdfBytes()), "Draft upload");
        assertThat(downloadDocument("/api/v1/students/me/verification/evidence/document", student.accessToken()).getBody()).isEqualTo(validPdfBytes());
        requireOk(authorizedPost(SUBMIT, student.accessToken(), null), "Submit with ID");
        UUID caseId = myVerificationCaseId(student.accessToken());
        String path = "/api/v1/universities/" + university + "/verification-cases/" + caseId + "/evidence/document";
        var coordinator = createStudent("id-coord", university, department, "DRAFT");
        insertUniversityMembership(university, coordinator.userId(), "DEPARTMENT_COORDINATOR", List.of(department));
        var outside = createStudent("id-outside", university, otherDepartment, "DRAFT");
        insertUniversityMembership(university, outside.userId(), "DEPARTMENT_COORDINATOR", List.of(otherDepartment));
        assertThat(downloadDocument(path, coordinator.accessToken()).getBody()).isEqualTo(validPdfBytes());
        assertThat(downloadDocument(path, outside.accessToken()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(downloadDocument(path, student.accessToken()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(unauthenticatedGet(path).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(uploadEvidence(student.accessToken(), "replacement.pdf", "application/pdf", validPdfBytes()).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test void anotherStudentsFileCannotBeSubmittedEvenIfPointerIsCorrupted() {
        UUID university = insertVerifiedUniversity("ID owner");
        UUID department = insertDepartment(university, "Computing", "CS");
        var owner = createStudent("id-owner", university, department, "DRAFT");
        var other = createStudent("id-other", university, department, "DRAFT");
        requireOk(uploadEvidence(owner.accessToken(), "id.pdf", "application/pdf", validPdfBytes()), "Upload");
        jdbcTemplate.update("UPDATE student_enrollments SET draft_evidence_stored_file_id = (SELECT draft_evidence_stored_file_id FROM student_enrollments WHERE id = ?) WHERE id = ?", owner.enrollmentId(), other.enrollmentId());
        var response = authorizedPost(SUBMIT, other.accessToken(), null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("STUDENT_ID_EVIDENCE_REQUIRED");
    }

    @Test void cvClassificationAndMissingBytesCannotMasqueradeAsStudentId() {
        UUID university = insertVerifiedUniversity("ID integrity");
        UUID department = insertDepartment(university, "Computing", "CS");
        for (String corruptField : List.of("classification", "storage_key")) {
            var student = createStudent("id-integrity", university, department, "DRAFT");
            requireOk(uploadEvidence(student.accessToken(), "id.pdf", "application/pdf", validPdfBytes()), "Upload");
            UUID fileId = jdbcTemplate.queryForObject("SELECT draft_evidence_stored_file_id FROM student_enrollments WHERE id = ?", UUID.class, student.enrollmentId());
            if (corruptField.equals("classification")) {
                jdbcTemplate.update("UPDATE stored_files SET classification = 'CV' WHERE id = ?", fileId);
            } else {
                jdbcTemplate.update("UPDATE stored_files SET storage_key = ? WHERE id = ?", "missing-" + UUID.randomUUID(), fileId);
            }
            var response = authorizedPost(SUBMIT, student.accessToken(), null);
            assertThat(errorCode(response)).isEqualTo("STUDENT_ID_EVIDENCE_REQUIRED");
            assertThat(authorizedGet("/api/v1/students/me/enrollment", student.accessToken()).getBody().get("verificationStatus")).isEqualTo("DRAFT");
            assertThat(authorizedGet("/api/v1/students/me/verification", student.accessToken()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }
    }
}
