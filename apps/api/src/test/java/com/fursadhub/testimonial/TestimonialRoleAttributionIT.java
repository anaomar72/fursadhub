package com.fursadhub.testimonial;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every FursadHub role may share a story, and every story is published under the role its author
 * actually holds.
 *
 * <p>The defect these tests exist to lock down: attribution used to be a field in the submission
 * request, so a recruiter could sign their quote "Student · Jamhuriya University" and the public
 * home page would print it. Attribution is now derived from current PostgreSQL membership data and
 * frozen into the row, and the request has no role field at all — which is the property the first
 * test below verifies directly, by trying to send one.
 */
class TestimonialRoleAttributionIT extends AbstractPhase7IT {

    private static final String MINE = "/api/v1/me/testimonial";
    private static final String CONTEXT = MINE + "/context";
    private static final String PUBLIC = "/api/v1/public/testimonials";

    // ------------------------------------------------------------------ spoofing

    @Test
    void aRecruiterCannotSignTheirQuoteAsAStudentEvenBySendingTheOldFields() {
        UUID organizationId = createVerifiedOrganization(
                registerVerifiedAndLogin("attrib-owner"), "Spoof Test Ltd");
        var recruiter = organizationStaff("attrib-spoof", organizationId, "RECRUITER");

        // Exactly the payload that used to work: the caller naming their own role and institution.
        Map<String, Object> spoofed = new HashMap<>(submission("Warsame A.",
                "We shortlisted nominated candidates and public applicants from the same board."));
        spoofed.put("authorRole", "STUDENT");
        spoofed.put("authorAffiliation", "Jamhuriya University");

        ResponseEntity<Map> submitted = authorizedPost(MINE, recruiter.token(), spoofed);
        assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.OK);

        // The extra fields were not rejected — they were simply never part of the contract, and the
        // server derived the truth instead of reading them.
        assertThat(submitted.getBody().get("authorRole")).isEqualTo("RECRUITER");
        assertThat(submitted.getBody().get("authorAudience")).isEqualTo("ORGANIZATION");
        assertThat(submitted.getBody().get("authorAffiliation")).isEqualTo("Spoof Test Ltd");
    }

    // ------------------------------------------------------------------ the whole role matrix

    @Test
    void eachRoleSubmitsAndIsPublishedUnderItsOwnRealRole() {
        UUID universityId = insertVerifiedUniversity("Attribution University");
        UUID departmentId = insertDepartment(universityId, "Information Technology", "IT-ATTR");
        UUID organizationId = createVerifiedOrganization(
                registerVerifiedAndLogin("attrib-org-owner"), "Attribution Ltd");
        var moderator = platformAdmin("attrib-moderator", "SUPER_ADMIN");

        record Case(String token, String expectedRole, String expectedAudience, String expectedAffiliation) {
        }

        var verifiedStudent = createVerifiedStudent("attrib-student", universityId, departmentId);
        List<Case> cases = List.of(
                // A verified student is named with their university, because FursadHub confirmed it.
                new Case(verifiedStudent.accessToken(), "STUDENT", "STUDENT", "Attribution University"),
                new Case(universityStaff("attrib-uni-admin", universityId, "UNIVERSITY_ADMIN", List.of()).token(),
                        "UNIVERSITY_ADMIN", "UNIVERSITY", "Attribution University"),
                new Case(universityStaff("attrib-coordinator", universityId, "DEPARTMENT_COORDINATOR",
                        List.of(departmentId)).token(),
                        "DEPARTMENT_COORDINATOR", "UNIVERSITY", "Attribution University"),
                new Case(universityStaff("attrib-uni-supervisor", universityId, "UNIVERSITY_SUPERVISOR",
                        List.of(departmentId)).token(),
                        "UNIVERSITY_SUPERVISOR", "UNIVERSITY", "Attribution University"),
                new Case(organizationStaff("attrib-org-admin", organizationId, "ORGANIZATION_ADMIN").token(),
                        "ORGANIZATION_ADMIN", "ORGANIZATION", "Attribution Ltd"),
                new Case(organizationStaff("attrib-recruiter", organizationId, "RECRUITER").token(),
                        "RECRUITER", "ORGANIZATION", "Attribution Ltd"),
                new Case(organizationStaff("attrib-org-supervisor", organizationId, "ORGANIZATION_SUPERVISOR").token(),
                        "ORGANIZATION_SUPERVISOR", "ORGANIZATION", "Attribution Ltd"),
                // Platform staff carry no institution: they speak for FursadHub itself, and the
                // public card says so in its own words rather than borrowing a customer's name.
                new Case(platformAdmin("attrib-super", "SUPER_ADMIN").token(), "SUPER_ADMIN", "PLATFORM", null),
                new Case(platformAdmin("attrib-officer", "VERIFICATION_OFFICER").token(),
                        "VERIFICATION_OFFICER", "PLATFORM", null));

        for (Case testCase : cases) {
            // The form is told the same truth before the author types anything.
            ResponseEntity<Map> context = authorizedGet(CONTEXT, testCase.token());
            assertThat(context.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(context.getBody().get("eligible")).isEqualTo(true);
            assertThat(context.getBody().get("authorRole")).isEqualTo(testCase.expectedRole());
            assertThat(context.getBody().get("authorAffiliation")).isEqualTo(testCase.expectedAffiliation());

            ResponseEntity<Map> submitted = authorizedPost(MINE, testCase.token(), submission("Hibo " + testCase.expectedRole(),
                    "Coordinating this internship through one FursadHub workflow removed a week of email."));
            assertThat(submitted.getStatusCode())
                    .withFailMessage("%s could not submit: %s", testCase.expectedRole(), submitted.getBody())
                    .isEqualTo(HttpStatus.OK);
            assertThat(submitted.getBody().get("authorRole")).isEqualTo(testCase.expectedRole());
            assertThat(submitted.getBody().get("authorAudience")).isEqualTo(testCase.expectedAudience());
            assertThat(submitted.getBody().get("authorAffiliation")).isEqualTo(testCase.expectedAffiliation());

            // And the same attribution survives to the anonymous public card.
            UUID id = UUID.fromString((String) submitted.getBody().get("id"));
            requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", moderator.token(), null),
                    "Publish " + testCase.expectedRole());
            Map<String, Object> published = publicRow(id);
            assertThat(published.get("authorRole")).isEqualTo(testCase.expectedRole());
            assertThat(published.get("authorAffiliation")).isEqualTo(testCase.expectedAffiliation());

            requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/unpublish", moderator.token(),
                    Map.of()), "Unpublish " + testCase.expectedRole());
        }
    }

    // ------------------------------------------------------------------ precedence and snapshots

    @Test
    void staffWhoAreAlsoStudentsArePublishedUnderTheStaffRole() {
        UUID universityId = insertVerifiedUniversity("Dual Role University");
        UUID departmentId = insertDepartment(universityId, "Engineering", "ENG-DUAL");
        var student = createVerifiedStudent("attrib-dual", universityId, departmentId);
        // The same person is given a coordinator membership. They are genuinely both.
        insertUniversityMembership(universityId, student.userId(), "DEPARTMENT_COORDINATOR", List.of(departmentId));

        ResponseEntity<Map> submitted = authorizedPost(MINE, student.accessToken(), submission("Farhia N.",
                "Our department nominates students and follows every placement in the same queue."));
        assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.OK);
        // A staff member speaking about the product is speaking with the staff hat on.
        assertThat(submitted.getBody().get("authorRole")).isEqualTo("DEPARTMENT_COORDINATOR");
    }

    @Test
    void platformStaffOutrankEveryOtherHatTheyWear() {
        UUID organizationId = createVerifiedOrganization(
                registerVerifiedAndLogin("attrib-plat-owner"), "Platform Hat Ltd");
        var officer = platformAdmin("attrib-plat-officer", "VERIFICATION_OFFICER");
        insertOrganizationMembership(organizationId, officer.userId(), "RECRUITER");

        ResponseEntity<Map> submitted = authorizedPost(MINE, officer.token(), submission("Idil M.",
                "Reviewing institution evidence in one queue is the part of my week that got shorter."));
        assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.OK);
        // FursadHub's own staff must never read as a customer endorsement, so the platform role wins
        // and no organization name is attached to it.
        assertThat(submitted.getBody().get("authorRole")).isEqualTo("VERIFICATION_OFFICER");
        assertThat(submitted.getBody().get("authorAudience")).isEqualTo("PLATFORM");
        assertThat(submitted.getBody().get("authorAffiliation")).isNull();
    }

    @Test
    void aPublishedQuoteKeepsTheRoleItWasWrittenUnderAfterTheAuthorMovesOn() {
        UUID organizationId = createVerifiedOrganization(
                registerVerifiedAndLogin("attrib-snap-owner"), "Snapshot Ltd");
        var recruiter = organizationStaff("attrib-snapshot", organizationId, "RECRUITER");
        var moderator = platformAdmin("attrib-snapshot-mod", "SUPER_ADMIN");

        UUID id = UUID.fromString((String) authorizedPost(MINE, recruiter.token(), submission("Abdirahman K.",
                "Two of our three interns this term came through university nominations."))
                .getBody().get("id"));
        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", moderator.token(), null),
                "Publish");

        // The author is promoted, then leaves the organization entirely.
        jdbcTemplate.update("UPDATE organization_memberships SET role = 'ORGANIZATION_SUPERVISOR' WHERE user_id = ?",
                recruiter.userId());
        jdbcTemplate.update("UPDATE organization_memberships SET revoked_at = now() WHERE user_id = ?",
                recruiter.userId());

        // Their published words still say what was true when they wrote them, and the institution
        // does not vanish from the card along with the membership row.
        Map<String, Object> published = publicRow(id);
        assertThat(published.get("authorRole")).isEqualTo("RECRUITER");
        assertThat(published.get("authorAffiliation")).isEqualTo("Snapshot Ltd");

        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/unpublish", moderator.token(),
                Map.of()), "Unpublish");
    }

    // ------------------------------------------------------------------ fail closed

    @Test
    void anAccountWithNoFursadHubRoleCannotSubmitAndIsNotSilentlyLabelledAStudent() {
        // Registered and email-verified, but no student profile and no membership anywhere.
        String nobody = registerVerifiedAndLogin("attrib-roleless");

        ResponseEntity<Map> context = authorizedGet(CONTEXT, nobody);
        assertThat(context.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(context.getBody().get("eligible")).isEqualTo(false);
        assertThat(context.getBody().get("authorRole")).isNull();

        ResponseEntity<Map> refused = authorizedPost(MINE, nobody, submission("Nobody N.",
                "This account holds no FursadHub role at all and should not be attributed one."));
        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(refused.getBody().get("code")).isEqualTo("TESTIMONIAL_ROLE_NOT_ELIGIBLE");
    }

    @Test
    void anUnverifiedStudentMayShareButIsNeverNamedWithAnUnconfirmedUniversity() {
        UUID universityId = insertVerifiedUniversity("Unconfirmed Claim University");
        UUID departmentId = insertDepartment(universityId, "Business", "BUS-UNCONF");
        var student = createStudent("attrib-unverified", universityId, departmentId, "SUBMITTED");

        ResponseEntity<Map> submitted = authorizedPost(MINE, student.accessToken(), submission("Ayan H.",
                "I could build my profile and browse internships while my enrollment was in review."));
        assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(submitted.getBody().get("authorRole")).isEqualTo("STUDENT");
        // The enrollment is a claim FursadHub has not confirmed. Printing the university name beside
        // this quote would turn that claim into a platform statement about a real institution.
        assertThat(submitted.getBody().get("authorAffiliation")).isNull();
    }

    // ------------------------------------------------------------------ self-moderation

    @Test
    void aSuperAdminCannotPublishTheirOwnTestimonial() {
        var admin = platformAdmin("attrib-self-mod", "SUPER_ADMIN");
        UUID id = UUID.fromString((String) authorizedPost(MINE, admin.token(), submission("Maxamed W.",
                "Running institution verification and testimonial review from one console saves a context switch."))
                .getBody().get("id"));

        // Full platform authority, and still not a second person's decision.
        ResponseEntity<Map> selfPublish =
                authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", admin.token(), null);
        assertThat(selfPublish.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(selfPublish.getBody().get("code")).isEqualTo("TESTIMONIAL_SELF_MODERATION_DENIED");

        // The same rule covers rejecting and unpublishing, so it is "not your own row" rather than a
        // list of exceptions.
        assertThat(authorizedPost("/api/v1/admin/testimonials/" + id + "/reject", admin.token(),
                Map.of("note", "Withdrawing my own quote")).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(publicIds()).doesNotContain(id.toString());

        // A DIFFERENT moderator may act on it, which is the whole point of the restriction.
        var other = platformAdmin("attrib-other-mod", "SUPER_ADMIN");
        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", other.token(), null),
                "Publish by another moderator");
        assertThat(publicIds()).contains(id.toString());

        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/unpublish", other.token(), Map.of()),
                "Unpublish");
    }

    // ------------------------------------------------------------------ helpers

    private Map<String, Object> submission(String name, String body) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("authorDisplayName", name);
        payload.put("body", body);
        payload.put("rating", 5);
        return payload;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> publicList() {
        ResponseEntity<List> response = restTemplate.getForEntity(url(PUBLIC), List.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private Map<String, Object> publicRow(UUID id) {
        return publicList().stream()
                .filter(row -> id.toString().equals(row.get("id")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Testimonial " + id + " is not on the public list"));
    }

    private List<String> publicIds() {
        return publicList().stream().map(row -> (String) row.get("id")).toList();
    }
}
