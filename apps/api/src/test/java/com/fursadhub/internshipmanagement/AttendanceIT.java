package com.fursadhub.internshipmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Attendance over real HTTP against real PostgreSQL (CLAUDE.md section 43, Phase 6 section 38).
 *
 * <p>Proves the confirmation state machine, the date and uniqueness rules, and — most importantly —
 * that Organization A cannot touch Organization B's attendance and Student A cannot see Student B's.
 */
class AttendanceIT extends AbstractPhase6IT {

    @Test
    void assignedSupervisorRecordsAndConfirmsAttendanceAndTheStudentSeesIt() {
        InternshipFixture fixture = createActiveInternship("att-happy");

        ResponseEntity<Map> recorded = recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT");
        assertThat(recorded.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(recorded.getBody()).containsEntry("confirmationStatus", "RECORDED");
        String recordId = (String) recorded.getBody().get("id");

        ResponseEntity<Map> confirmed = authorizedPost(
                "/api/v1/attendance/" + recordId + "/confirm", fixture.organizationSupervisor().token(), null);
        assertThat(confirmed.getBody()).containsEntry("confirmationStatus", "CONFIRMED");

        ResponseEntity<List> studentView = authorizedGetList(
                "/api/v1/placements/" + fixture.placementId() + "/attendance", fixture.studentToken());
        assertThat(studentView.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(studentView.getBody()).hasSize(1);
    }

    @Test
    void theStudentMayDisputeAndTheSupervisorResolvesWithoutErasingTheirReason() {
        InternshipFixture fixture = createActiveInternship("att-dispute");
        String recordId = (String) recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "ABSENT").getBody().get("id");

        ResponseEntity<Map> disputed = authorizedPost("/api/v1/attendance/" + recordId + "/dispute",
                fixture.studentToken(), Map.of("reason", "I was working from the client site."));
        assertThat(disputed.getBody()).containsEntry("confirmationStatus", "DISPUTED");

        ResponseEntity<Map> resolved = authorizedPost("/api/v1/attendance/" + recordId + "/resolve",
                fixture.organizationSupervisor().token(),
                Map.of("correctedValue", "PRESENT", "resolutionNote", "Confirmed with the client."));
        assertThat(resolved.getBody()).containsEntry("confirmationStatus", "RESOLVED");
        assertThat(resolved.getBody()).containsEntry("attendanceValue", "PRESENT");
        // The dispute is settled, not erased.
        assertThat(resolved.getBody()).containsEntry("disputeReason", "I was working from the client site.");
    }

    @Test
    void aConfirmedRecordIsStillDisputable() {
        InternshipFixture fixture = createActiveInternship("att-late");
        String recordId = (String) recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "ABSENT").getBody().get("id");
        authorizedPost("/api/v1/attendance/" + recordId + "/confirm",
                fixture.organizationSupervisor().token(), null);

        ResponseEntity<Map> disputed = authorizedPost("/api/v1/attendance/" + recordId + "/dispute",
                fixture.studentToken(), Map.of("reason", "Only noticed this now."));

        assertThat(disputed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(disputed.getBody()).containsEntry("confirmationStatus", "DISPUTED");
    }

    @Test
    void aSecondRecordForTheSameDateIsBlockedByTheDatabaseConstraint() {
        InternshipFixture fixture = createActiveInternship("att-dupe");
        recordAttendance(fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT");

        ResponseEntity<Map> duplicate = recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "ABSENT");

        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(duplicate)).isEqualTo("ATTENDANCE_ALREADY_RECORDED");
    }

    @Test
    void aDateOutsideTheInternshipPeriodIsRejected() {
        InternshipFixture fixture = createActiveInternship("att-range");

        ResponseEntity<Map> response = recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture).minusYears(1), "PRESENT");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("ATTENDANCE_DATE_OUT_OF_RANGE");
    }

    @Test
    void anInvalidAttendanceValueIsRejected() {
        InternshipFixture fixture = createActiveInternship("att-value");

        ResponseEntity<Map> response = recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "MAYBE_PRESENT");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void aResolutionCannotBeAppliedToARecordThatWasNeverDisputed() {
        InternshipFixture fixture = createActiveInternship("att-trans");
        String recordId = (String) recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT").getBody().get("id");

        ResponseEntity<Map> response = authorizedPost("/api/v1/attendance/" + recordId + "/resolve",
                fixture.organizationSupervisor().token(), Map.of("correctedValue", "ABSENT"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("ATTENDANCE_INVALID_TRANSITION");
    }

    @Test
    void aStudentCannotRecordTheirOwnAttendance() {
        InternshipFixture fixture = createActiveInternship("att-selfrecord");

        ResponseEntity<Map> response = recordAttendance(
                fixture.studentToken(), fixture.placementId(), placementStartDate(fixture), "PRESENT");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anOrganizationAdminOrRecruiterMayReadButNotRecord() {
        InternshipFixture fixture = createActiveInternship("att-recruiter");
        recordAttendance(fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT");

        // Reading is fine — they already see the placement. Authoring is not: they did not observe
        // the student.
        assertThat(authorizedGetList("/api/v1/placements/" + fixture.placementId() + "/attendance",
                fixture.placement().recruiterToken()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(recordAttendance(fixture.placement().recruiterToken(), fixture.placementId(),
                placementStartDate(fixture).plusDays(1), "PRESENT").getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void organizationACannotAccessOrganizationBAttendance() {
        InternshipFixture ours = createActiveInternship("att-org-a");
        InternshipFixture theirs = createActiveInternship("att-org-b");

        // Their supervisor, our placement.
        assertThat(recordAttendance(theirs.organizationSupervisor().token(), ours.placementId(),
                placementStartDate(ours), "PRESENT").getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/placements/" + ours.placementId() + "/attendance",
                theirs.organizationSupervisor().token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void studentACannotAccessStudentBAttendance() {
        InternshipFixture mine = createActiveInternship("att-stu-a");
        InternshipFixture theirs = createActiveInternship("att-stu-b");
        String recordId = (String) recordAttendance(
                theirs.organizationSupervisor().token(), theirs.placementId(),
                placementStartDate(theirs), "ABSENT").getBody().get("id");

        assertThat(authorizedGet("/api/v1/placements/" + theirs.placementId() + "/attendance",
                mine.studentToken()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        // Nor may they dispute someone else's record.
        assertThat(authorizedPost("/api/v1/attendance/" + recordId + "/dispute", mine.studentToken(),
                Map.of("reason", "Not mine, but let me try.")).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void aSupervisorWhoseAssignmentWasClosedLosesAccessImmediately() {
        InternshipFixture fixture = createActiveInternship("att-reassign");
        Staff replacement = organizationStaff(
                "att-osup2", fixture.placement().organizationId(), "ORGANIZATION_SUPERVISOR");
        assignOrganizationSupervisor(
                fixture.placement(), fixture.placement().recruiterToken(), replacement.userId());

        // The outgoing supervisor's assignment is closed, so their scope ends with it.
        ResponseEntity<Map> response = recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(recordAttendance(replacement.token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void universityStaffInScopeMayReadAttendanceButNotRecordIt() {
        InternshipFixture fixture = createActiveInternship("att-uni");
        recordAttendance(fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT");

        assertThat(authorizedGetList("/api/v1/placements/" + fixture.placementId() + "/attendance",
                fixture.universitySupervisor().token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(recordAttendance(fixture.universitySupervisor().token(), fixture.placementId(),
                placementStartDate(fixture).plusDays(1), "PRESENT").getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
