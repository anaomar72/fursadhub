package com.fursadhub.student;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class StudentProfessionalProfileIT extends AbstractPhase7IT {
    @Test void professionalFieldsPersistAndLegacyUpdatesPreserveThem() {
        UUID university = insertVerifiedUniversity("Professional profile");
        UUID department = insertDepartment(university, "Computing", "CS");
        var student = createStudent("professional", university, department, "DRAFT");
        var professional = Map.of("headline", "Software engineering student", "summary", "Waxaan bartaa injineernimada.",
                "city", "Mogadishu", "countryCode", "SO", "skills", List.of("Java", "TypeScript"),
                "linkedinUrl", "https://www.linkedin.com/in/student", "githubUrl", "https://github.com/student", "portfolioUrl", "https://example.com/work");
        var saved = authorizedPut("/api/v1/students/me/profile", student.accessToken(), Map.of("fullName", "Student Name", "professional", professional));
        requireOk(saved, "Save professional profile");
        assertThat(saved.getBody().get("professional")).isEqualTo(professional);
        requireOk(authorizedPut("/api/v1/students/me/profile", student.accessToken(), Map.of("fullName", "Updated Name")), "Legacy name update");
        assertThat(authorizedGet("/api/v1/students/me/profile", student.accessToken()).getBody().get("professional")).isEqualTo(professional);
        assertThat(authorizedGet("/api/v1/students/me/enrollment", student.accessToken()).getBody().get("universityId")).isEqualTo(university.toString());
        requireOk(uploadEvidence(student.accessToken(), "id.pdf", "application/pdf", validPdfBytes()), "ID upload");
        requireOk(authorizedPost("/api/v1/students/me/enrollment/submit-verification", student.accessToken(), null), "Submit");
        var coordinator = universityStaff("professional-coord", university, "DEPARTMENT_COORDINATOR", List.of(department));
        UUID otherDepartment = insertDepartment(university, "Business", "BA");
        var outside = universityStaff("professional-outside", university, "DEPARTMENT_COORDINATOR", List.of(otherDepartment));
        String path = "/api/v1/universities/" + university + "/verification-cases/" + myVerificationCaseId(student.accessToken());
        assertThat(authorizedGet(path, coordinator.token()).getBody().get("professional")).isEqualTo(professional);
        assertThat(authorizedGet(path, outside.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(unauthenticatedGet("/api/v1/students/me/profile").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test void invalidLinksAndOversizedSkillsAreRejectedWithoutChangingProfile() {
        String token = registerVerifiedAndLogin("professional-invalid");
        requireOk(authorizedPut("/api/v1/students/me/profile", token, Map.of("fullName", "Original")), "Create");
        for (var professional : List.of(Map.of("portfolioUrl", "javascript:alert(1)"),
                Map.of("portfolioUrl", "https://user:password@example.com"), Map.of("skills", Collections.nCopies(26, "Java")),
                Map.of("skills", List.of("x".repeat(61))), Map.of("countryCode", "ZZ"))) {
            assertThat(authorizedPut("/api/v1/students/me/profile", token, Map.of("fullName", "Changed", "professional", professional)).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        assertThat(authorizedGet("/api/v1/students/me/profile", token).getBody().get("fullName")).isEqualTo("Original");
    }
}
