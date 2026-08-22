package com.fursadhub.opportunity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Phase 3 mandatory target tests (Phase 3 spec section 19 "Targets"). */
class OpportunityTargetIT extends AbstractPhase3IT {

    @Test
    void multipleUniversitiesCanBeTargeted() {
        String adminToken = registerAndLogin("multi-target-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Multi Target Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "UNIVERSITY_TARGETED", Map.of());
        UUID secondUniversity = insertVerifiedUniversity("Second University " + UUID.randomUUID());
        UUID secondDepartment = insertDepartment(secondUniversity, "Computer Science", "CS");

        ResponseEntity<Map> first = authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken,
                targetBody(JAMHURIYA_UNIVERSITY_ID, List.of(CS_DEPARTMENT_ID), 5, LocalDate.now().plusDays(20)));
        ResponseEntity<Map> second = authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken,
                targetBody(secondUniversity, List.of(secondDepartment), 3, LocalDate.now().plusDays(20)));

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        ResponseEntity<List> list = restTemplate.exchange(
                url("/api/v1/opportunities/" + opportunityId + "/targets"), HttpMethod.GET, new HttpEntity<>(headers), List.class);
        assertThat(list.getBody()).hasSize(2);
    }

    @Test
    void duplicateTargetUniversityIsBlocked() {
        String adminToken = registerAndLogin("dup-target-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Dup Target Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "UNIVERSITY_TARGETED", Map.of());

        authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken,
                targetBody(JAMHURIYA_UNIVERSITY_ID, List.of(CS_DEPARTMENT_ID), 5, LocalDate.now().plusDays(20)));
        ResponseEntity<Map> duplicate = authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken,
                targetBody(JAMHURIYA_UNIVERSITY_ID, List.of(BA_DEPARTMENT_ID), 2, LocalDate.now().plusDays(25)));

        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(duplicate.getBody().get("code")).isEqualTo("OPPORTUNITY_TARGET_ALREADY_EXISTS");
    }

    @Test
    void departmentFromAnotherUniversityIsRejected() {
        String adminToken = registerAndLogin("wrong-dept-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Wrong Dept Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "UNIVERSITY_TARGETED", Map.of());
        UUID otherUniversity = insertVerifiedUniversity("Other University " + UUID.randomUUID());
        UUID otherDepartment = insertDepartment(otherUniversity, "Other Dept", "OD");

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken,
                targetBody(JAMHURIYA_UNIVERSITY_ID, List.of(otherDepartment), 5, LocalDate.now().plusDays(20)));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("DEPARTMENT_NOT_IN_UNIVERSITY");
    }

    @Test
    void requestedNomineesBelowOneIsRejected() {
        String adminToken = registerAndLogin("nominees-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Nominees Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "UNIVERSITY_TARGETED", Map.of());

        Map<String, Object> body = new java.util.LinkedHashMap<>(targetBody(
                JAMHURIYA_UNIVERSITY_ID, List.of(CS_DEPARTMENT_ID), 5, LocalDate.now().plusDays(20)));
        body.put("requestedNominees", 0);

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken, body);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void nominationDeadlineOnOrAfterStartDateIsRejected() {
        String adminToken = registerAndLogin("deadline-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Deadline Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "UNIVERSITY_TARGETED", Map.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken,
                targetBody(JAMHURIYA_UNIVERSITY_ID, List.of(CS_DEPARTMENT_ID), 5, LocalDate.now().plusMonths(3)));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }
}
