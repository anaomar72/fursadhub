package com.fursadhub.candidacy;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.assertThat;

class ApplicationCvIT extends AbstractPhase7IT {
    @Test void applicationRequiresOwnCvAndKeepsTwoApplicationsIndependent() {
        var first = publishPublicOpportunity("cv-first");
        var second = publishPublicOpportunity("cv-second");
        UUID university = insertVerifiedUniversity("CV University");
        UUID department = insertDepartment(university, "Computing", "CS");
        var student = createVerifiedStudent("cv-student", university, department);
        String token = student.accessToken();
        String firstApply = "/api/v1/opportunities/" + first.opportunityId() + "/applications";
        var refused = authorizedPost(firstApply, token, Map.of());
        assertThat(errorCode(refused)).isEqualTo("APPLICATION_CV_REQUIRED");
        byte[] a = "%PDF-1.7 CV A".getBytes(StandardCharsets.UTF_8);
        byte[] b = "%PDF-1.7 CV B".getBytes(StandardCharsets.UTF_8);
        String uploadA = upload(token, first.opportunityId(), a);
        String uploadB = upload(token, second.opportunityId(), b);
        var wrongFlow = authorizedPost(firstApply, token, Map.of("cvUploadId", uploadB));
        assertThat(errorCode(wrongFlow)).isEqualTo("APPLICATION_CV_NOT_FOUND");
        var submittedA = authorizedPost(firstApply, token, Map.of("cvUploadId", uploadA));
        assertThat(submittedA.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var submittedB = authorizedPost("/api/v1/opportunities/" + second.opportunityId() + "/applications", token, Map.of("cvUploadId", uploadB));
        assertThat(submittedB.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String cvA = "/api/v1/candidacies/" + submittedA.getBody().get("id") + "/cv";
        String cvB = "/api/v1/candidacies/" + submittedB.getBody().get("id") + "/cv";
        // Updating the legacy global profile CV cannot alter either new application.
        requireOk(uploadCv(token, "legacy.pdf", "application/pdf", validPdfBytes()), "Legacy CV upload");
        assertThat(downloadDocument(cvA, first.recruiterToken()).getBody()).isEqualTo(a);
        assertThat(downloadDocument(cvB, second.recruiterToken()).getBody()).isEqualTo(b);
        String usedUpload = "/api/v1/opportunities/" + first.opportunityId() + "/application-cv/" + uploadA;
        assertThat(authorizedDelete(usedUpload, token).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(authorizedPost(firstApply, token, Map.of("cvUploadId", uploadA)))).isEqualTo("APPLICATION_CV_ALREADY_USED");
        String replacement = upload(token, first.opportunityId(), b);
        assertThat(errorCode(authorizedPost(firstApply, token, Map.of("cvUploadId", replacement)))).isEqualTo("STUDENT_ALREADY_APPLIED");
        assertThat(downloadDocument(cvA, first.recruiterToken()).getBody()).isEqualTo(a);
        assertThat(downloadDocument(cvA, second.recruiterToken()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(downloadDocument(cvA, token).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(unauthenticatedGet(cvA).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        var supervisor = organizationStaff("cv-supervisor", first.organizationId(), "ORGANIZATION_SUPERVISOR");
        assertThat(downloadDocument(cvA, supervisor.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        var recruiter = organizationStaff("cv-recruiter", first.organizationId(), "RECRUITER");
        assertThat(downloadDocument(cvA, recruiter.token()).getBody()).isEqualTo(a);
        assertThat(authorizedPost(firstApply, first.recruiterToken(), Map.of("cvUploadId", uploadA)).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(unauthenticatedPost(firstApply, Map.of()).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test void anotherStudentCannotClaimOrDownloadUpload() {
        var opportunity = publishPublicOpportunity("cv-owner-org");
        UUID university = insertVerifiedUniversity("CV Ownership");
        UUID department = insertDepartment(university, "Computing", "CS");
        var owner = createVerifiedStudent("cv-owner", university, department);
        var other = createVerifiedStudent("cv-other", university, department);
        String upload = upload(owner.accessToken(), opportunity.opportunityId(), validPdfBytes());
        String base = "/api/v1/opportunities/" + opportunity.opportunityId();
        assertThat(authorizedPost(base + "/applications", other.accessToken(), Map.of("cvUploadId", upload)).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(downloadDocument(base + "/application-cv/" + upload + "/document", other.accessToken()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(multipartPost(base + "/application-cv", owner.accessToken(), "image.png", "image/png", validPngBytes()).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private String upload(String token, UUID opportunity, byte[] bytes) {
        var response = multipartPost("/api/v1/opportunities/" + opportunity + "/application-cv", token, "cv.pdf", "application/pdf", bytes);
        requireOk(response, "Application CV upload");
        return (String) response.getBody().get("id");
    }
}
