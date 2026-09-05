package com.fursadhub.student;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B4 — saved internships.
 *
 * <p>Covers saving, unsaving, the visible list, the batch status lookup, and the three properties
 * that make this feature safe: it is private to the owning student, it never becomes a visibility
 * bypass, and it survives visibility changes without losing the student's intent.
 */
@SuppressWarnings("unchecked")
class SavedOpportunityIT extends AbstractPhase3IT {

    private static final String SAVED = "/api/v1/students/me/saved-opportunities";

    // ---------------------------------------------------------------- save

    @Test
    void studentCanSaveAPublicOpportunityAndSeeItInTheirList() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-save");

        assertThat(authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of()).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);

        Map<String, Object> page = authorizedGet(SAVED, student).getBody();
        List<Map<String, Object>> content = (List<Map<String, Object>>) page.get("content");
        assertThat(content).hasSize(1);
        assertThat(((Number) page.get("totalElements")).longValue()).isEqualTo(1);
        assertThat(content.get(0).get("savedAt")).isNotNull();
        assertThat(((Map<String, Object>) content.get(0).get("opportunity")).get("id"))
                .isEqualTo(fixture.opportunityId().toString());
    }

    @Test
    void hybridOpportunitiesCanAlsoBeSaved() {
        Fixture fixture = publishedOpportunity("HYBRID");
        String student = studentToken("b4-hybrid");

        assertThat(authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of()).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(savedIds(student)).containsExactly(fixture.opportunityId().toString());
    }

    /**
     * A bookmark is not candidate intake, so it must not inherit the verified-enrollment
     * prerequisite. A student still working through verification is exactly who needs to keep a
     * reading list.
     */
    @Test
    void anUnverifiedStudentCanSave() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        // studentToken creates only the profile — no enrollment, so nothing is VERIFIED.
        String student = studentToken("b4-unverified");

        assertThat(authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of()).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(savedIds(student)).hasSize(1);
    }

    @Test
    void savingTwiceIsIdempotentAndStoresOneRow() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-idempotent");

        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());
        assertThat(authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of()).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(savedRowCount(fixture.opportunityId())).isEqualTo(1);
        assertThat(savedIds(student)).hasSize(1);
    }

    /**
     * The unique constraint is the authority. Two concurrent saves must leave exactly one row and
     * neither may surface the constraint violation as a 500.
     */
    @Test
    void concurrentDuplicateSavesCreateExactlyOneRow() throws Exception {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-concurrent");

        int attempts = 6;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch start = new CountDownLatch(1);
        List<java.util.concurrent.Future<HttpStatus>> results = new ArrayList<>();
        for (int index = 0; index < attempts; index++) {
            results.add(pool.submit(() -> {
                start.await();
                return (HttpStatus) authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of())
                        .getStatusCode();
            }));
        }
        start.countDown();

        for (java.util.concurrent.Future<HttpStatus> result : results) {
            assertThat(result.get(30, TimeUnit.SECONDS))
                    .as("a concurrent duplicate save must not fail")
                    .isEqualTo(HttpStatus.NO_CONTENT);
        }
        pool.shutdown();

        assertThat(savedRowCount(fixture.opportunityId())).isEqualTo(1);
    }

    // ---------------------------------------------------------------- save is not a visibility bypass

    @Test
    void aTargetedOnlyOpportunityCannotBeSavedAndIsNotDisclosed() {
        Fixture fixture = publishedOpportunity("UNIVERSITY_TARGETED");
        String student = studentToken("b4-targeted");

        ResponseEntity<Map> response = authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_NOT_FOUND");
    }

    @Test
    void aDraftOpportunityCannotBeSaved() {
        String owner = registerAndLogin("b4-draft-owner");
        UUID organizationId = createVerifiedOrganization(owner, uniqueName("B4 Draft Org"));
        UUID opportunityId = createDraftOpportunity(owner, organizationId, "PUBLIC", Map.of());
        String student = studentToken("b4-draft");

        assertThat(authorizedPost(SAVED + "/" + opportunityId, student, Map.of()).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void anOpportunityOfASuspendedOrganizationCannotBeNewlySaved() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        suspend(fixture.organizationId());
        String student = studentToken("b4-suspended");

        ResponseEntity<Map> response = authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_NOT_FOUND");
    }

    // ---------------------------------------------------------------- visibility changes after saving

    /**
     * The whole lifecycle policy in one test: a bookmark survives its opportunity becoming hidden,
     * disappears from the visible list while hidden, and comes back on its own — without a second
     * bookmark being created and without any opportunity row being rewritten.
     */
    @Test
    void aSavedOpportunitySurvivesSuspensionAndReappearsOnReVerification() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-lifecycle");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());
        assertThat(savedIds(student)).hasSize(1);

        suspend(fixture.organizationId());

        Map<String, Object> whileHidden = authorizedGet(SAVED, student).getBody();
        assertThat((List<Map<String, Object>>) whileHidden.get("content")).isEmpty();
        assertThat(((Number) whileHidden.get("totalElements")).longValue())
                .as("totals must describe visible saved items")
                .isZero();
        // The student's intent is preserved: the row is still there, merely not shown.
        assertThat(savedRowCount(fixture.opportunityId())).isEqualTo(1);

        reVerify(fixture.organizationId());

        assertThat(savedIds(student)).containsExactly(fixture.opportunityId().toString());
        assertThat(savedRowCount(fixture.opportunityId()))
                .as("re-verification must not create a second bookmark")
                .isEqualTo(1);
    }

    /** The same, driven by the opportunity's own lifecycle rather than the organization's. */
    @Test
    void aPausedOpportunityDropsOutOfTheSavedListAndReturnsOnResume() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-paused");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        authorizedPost("/api/v1/opportunities/" + fixture.opportunityId() + "/pause", fixture.ownerToken(), Map.of());
        assertThat(savedIds(student)).isEmpty();
        assertThat(savedRowCount(fixture.opportunityId())).isEqualTo(1);

        authorizedPost("/api/v1/opportunities/" + fixture.opportunityId() + "/resume", fixture.ownerToken(), Map.of());
        assertThat(savedIds(student)).containsExactly(fixture.opportunityId().toString());
    }

    // ---------------------------------------------------------------- unsave

    @Test
    void unsaveRemovesTheBookmarkAndIsIdempotent() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-unsave");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        assertThat(authorizedDelete(SAVED + "/" + fixture.opportunityId(), student).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(savedRowCount(fixture.opportunityId())).isZero();

        // Repeating it is a successful no-op, never a 404 that would disclose bookmark existence.
        assertThat(authorizedDelete(SAVED + "/" + fixture.opportunityId(), student).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
    }

    /**
     * A student must be able to tidy their own list after an opportunity stops being discoverable,
     * so unsave is deliberately NOT gated on current visibility.
     */
    @Test
    void aHiddenOpportunityCanStillBeUnsaved() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-unsave-hidden");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        suspend(fixture.organizationId());

        assertThat(authorizedDelete(SAVED + "/" + fixture.opportunityId(), student).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(savedRowCount(fixture.opportunityId())).isZero();
    }

    @Test
    void unsavingDoesNotTouchAnotherStudentsBookmark() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String studentA = studentToken("b4-owner-a");
        String studentB = studentToken("b4-owner-b");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), studentA, Map.of());
        authorizedPost(SAVED + "/" + fixture.opportunityId(), studentB, Map.of());

        authorizedDelete(SAVED + "/" + fixture.opportunityId(), studentA);

        assertThat(savedIds(studentA)).isEmpty();
        assertThat(savedIds(studentB)).containsExactly(fixture.opportunityId().toString());
    }

    // ---------------------------------------------------------------- list

    @Test
    void theListIsPrivateToTheOwningStudent() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String studentA = studentToken("b4-private-a");
        String studentB = studentToken("b4-private-b");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), studentA, Map.of());

        assertThat(savedIds(studentA)).hasSize(1);
        assertThat(savedIds(studentB)).as("a student must never see another's bookmarks").isEmpty();
    }

    @Test
    void theListIsNewestSavedFirstAndPaginates() {
        Fixture first = publishedOpportunity("PUBLIC");
        Fixture second = publishedOpportunity("PUBLIC");
        Fixture third = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-order");

        authorizedPost(SAVED + "/" + first.opportunityId(), student, Map.of());
        authorizedPost(SAVED + "/" + second.opportunityId(), student, Map.of());
        authorizedPost(SAVED + "/" + third.opportunityId(), student, Map.of());

        assertThat(savedIds(student)).containsExactly(
                third.opportunityId().toString(),
                second.opportunityId().toString(),
                first.opportunityId().toString());

        Map<String, Object> pageOne = authorizedGet(SAVED + "?page=0&size=2", student).getBody();
        assertThat((List<Map<String, Object>>) pageOne.get("content")).hasSize(2);
        assertThat(((Number) pageOne.get("totalElements")).longValue()).isEqualTo(3);
        assertThat(((Number) pageOne.get("totalPages")).intValue()).isEqualTo(2);

        Map<String, Object> pageTwo = authorizedGet(SAVED + "?page=1&size=2", student).getBody();
        assertThat((List<Map<String, Object>>) pageTwo.get("content")).hasSize(1);
    }

    /** The entry carries the PUBLIC opportunity shape, including the B3 enrichment, and nothing internal. */
    @Test
    void savedEntriesCarryThePublicOpportunityShapeWithB3Enrichment() {
        String owner = registerAndLogin("b4-shape-owner");
        UUID organizationId = createVerifiedOrganization(owner, uniqueName("B4 Shape Org"));
        UUID opportunityId = createDraftOpportunity(owner, organizationId, "PUBLIC", Map.of(
                "skills", List.of("Java", "SQL"),
                "perks", List.of("Mentorship"),
                "hoursPerWeek", 20));
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", owner, Map.of());

        String student = studentToken("b4-shape");
        authorizedPost(SAVED + "/" + opportunityId, student, Map.of());

        Map<String, Object> entry =
                ((List<Map<String, Object>>) authorizedGet(SAVED, student).getBody().get("content")).get(0);
        Map<String, Object> opportunity = (Map<String, Object>) entry.get("opportunity");

        assertThat((List<String>) opportunity.get("skills")).containsExactly("Java", "SQL");
        assertThat((List<String>) opportunity.get("perks")).containsExactly("Mentorship");
        assertThat(((Number) opportunity.get("hoursPerWeek")).intValue()).isEqualTo(20);
        assertThat(opportunity).containsKey("organization");
        // Nothing internal leaks through the saved route that the public route would withhold.
        assertThat(opportunity).doesNotContainKeys("status", "createdBy", "createdAt", "updatedAt", "organizationId");
        assertThat(entry).doesNotContainKeys("studentUserId", "id");
    }

    // ---------------------------------------------------------------- status

    @Test
    void statusReturnsOnlyTheStudentsOwnSavedIdsAmongThoseAsked() {
        Fixture saved = publishedOpportunity("PUBLIC");
        Fixture notSaved = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-status");
        String otherStudent = studentToken("b4-status-other");
        authorizedPost(SAVED + "/" + saved.opportunityId(), student, Map.of());
        authorizedPost(SAVED + "/" + notSaved.opportunityId(), otherStudent, Map.of());

        String query = "?opportunityId=" + saved.opportunityId() + "&opportunityId=" + notSaved.opportunityId();
        List<String> ids = (List<String>) authorizedGet(SAVED + "/status" + query, student)
                .getBody().get("savedOpportunityIds");

        assertThat(ids).containsExactly(saved.opportunityId().toString());
    }

    @Test
    void statusHandlesDuplicatesAndAnEmptyRequest() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-status-dupes");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        String repeated = "?opportunityId=" + fixture.opportunityId() + "&opportunityId=" + fixture.opportunityId();
        assertThat((List<String>) authorizedGet(SAVED + "/status" + repeated, student)
                .getBody().get("savedOpportunityIds"))
                .containsExactly(fixture.opportunityId().toString());

        assertThat((List<String>) authorizedGet(SAVED + "/status", student).getBody().get("savedOpportunityIds"))
                .isEmpty();
    }

    @Test
    void statusAcceptsExactlyTheCapAndRejectsOneMore() {
        String student = studentToken("b4-status-cap");

        assertThat(authorizedGet(SAVED + "/status" + distinctIds(50), student).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> tooMany = authorizedGet(SAVED + "/status" + distinctIds(51), student);
        assertThat(tooMany.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(tooMany.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    /**
     * The bound applies to the RAW parameter list, not the de-duplicated set. Otherwise 51 copies of
     * one id would collapse to one and bypass the limit entirely — and the cost this cap exists to
     * bound is the request the server must parse, not what survives de-duplication.
     */
    @Test
    void statusRejectsTooManyRawIdsEvenWhenTheyAreAllIdentical() {
        String student = studentToken("b4-status-raw-cap");
        UUID repeated = UUID.randomUUID();

        StringBuilder query = new StringBuilder("?");
        for (int index = 0; index < 51; index++) {
            query.append("opportunityId=").append(repeated).append('&');
        }

        ResponseEntity<Map> response = authorizedGet(SAVED + "/status" + query, student);
        assertThat(response.getStatusCode())
                .as("de-duplication must not become a way around the bound")
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    /** Within the bound, repeats are collapsed: one query, and each id appears once in the response. */
    @Test
    void duplicateIdsWithinTheBoundAreAcceptedAndReturnedOnce() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-status-raw-dupes");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        StringBuilder query = new StringBuilder("?");
        for (int index = 0; index < 50; index++) {
            query.append("opportunityId=").append(fixture.opportunityId()).append('&');
        }

        ResponseEntity<Map> response = authorizedGet(SAVED + "/status" + query, student);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<String>) response.getBody().get("savedOpportunityIds"))
                .containsExactly(fixture.opportunityId().toString());
    }

    private String distinctIds(int count) {
        StringBuilder query = new StringBuilder("?");
        for (int index = 0; index < count; index++) {
            query.append("opportunityId=").append(UUID.randomUUID()).append('&');
        }
        return query.toString();
    }

    // ---------------------------------------------------------------- authorization

    @Test
    void anonymousCallersAreRejectedOnEveryRoute() {
        Fixture fixture = publishedOpportunity("PUBLIC");

        assertThat(unauthenticated(HttpMethod.GET, SAVED)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unauthenticated(HttpMethod.POST, SAVED + "/" + fixture.opportunityId()))
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unauthenticated(HttpMethod.DELETE, SAVED + "/" + fixture.opportunityId()))
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unauthenticated(HttpMethod.GET, SAVED + "/status")).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /**
     * A recruiter or university administrator has no student profile, so they get the same
     * {@code STUDENT_PROFILE_NOT_FOUND} every other {@code /students/me} route already gives them.
     * No RBAC rule was added or relaxed for B4.
     */
    @Test
    void organizationAndUniversityUsersCannotUseTheStudentSavedRoutes() {
        Fixture fixture = publishedOpportunity("PUBLIC");

        String organizationUser = registerAndLogin("b4-org-user");
        createVerifiedOrganization(organizationUser, uniqueName("B4 Org User Org"));

        String universityEmail = uniqueEmail("b4-uni-user");
        register(universityEmail, "Password123");
        String universityUser = loginAndExtractAccessToken(universityEmail, "Password123");
        UUID universityId = insertVerifiedUniversity(uniqueName("B4 Uni"));
        insertUniversityMembership(universityId, userIdOf(universityEmail), "UNIVERSITY_ADMIN");

        for (String token : List.of(organizationUser, universityUser)) {
            assertThat(authorizedGet(SAVED, token).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(authorizedPost(SAVED + "/" + fixture.opportunityId(), token, Map.of()).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND);
        }
    }

    // ---------------------------------------------------------------- FK lifecycle

    @Test
    void deletingTheOpportunityCascadesTheBookmarkAway() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String student = studentToken("b4-cascade-opportunity");
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        jdbcTemplate.update("DELETE FROM internship_opportunities WHERE id = ?", fixture.opportunityId());

        assertThat(savedRowCount(fixture.opportunityId())).isZero();
    }

    @Test
    void deletingTheStudentCascadesTheirBookmarksAway() {
        Fixture fixture = publishedOpportunity("PUBLIC");
        String email = uniqueEmail("b4-cascade-student");
        register(email, "Password123");
        String student = loginAndExtractAccessToken(email, "Password123");
        createStudentProfile(student);
        authorizedPost(SAVED + "/" + fixture.opportunityId(), student, Map.of());

        jdbcTemplate.update("DELETE FROM users WHERE id = ?", userIdOf(email));

        assertThat(savedRowCount(fixture.opportunityId())).isZero();
    }

    // ---------------------------------------------------------------- helpers

    private record Fixture(UUID organizationId, UUID opportunityId, String ownerToken) {
    }

    /** A verified organization with one PUBLISHED opportunity in the given mode. */
    private Fixture publishedOpportunity(String mode) {
        String owner = registerAndLogin("b4-owner-" + UUID.randomUUID().toString().substring(0, 8));
        UUID organizationId = createVerifiedOrganization(owner, uniqueName("B4 Org"));
        boolean targetedOnly = "UNIVERSITY_TARGETED".equals(mode);
        // A targeted-only opportunity needs university targets before it may publish, which is a
        // whole nomination fixture this test does not otherwise need. Publishing it as PUBLIC and
        // then setting the mode directly produces the same state under test — PUBLISHED and
        // targeted-only — without pulling the targeting workflow into a bookmarks test.
        UUID opportunityId = createDraftOpportunity(owner, organizationId, targetedOnly ? "PUBLIC" : mode, Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", owner, Map.of());
        if (targetedOnly) {
            jdbcTemplate.update(
                    "UPDATE internship_opportunities SET mode = 'UNIVERSITY_TARGETED' WHERE id = ?", opportunityId);
        }
        return new Fixture(organizationId, opportunityId, owner);
    }

    /** A registered user with a student profile — deliberately no enrollment, so nothing is verified. */
    private String studentToken(String prefix) {
        String email = uniqueEmail(prefix);
        register(email, "Password123");
        String token = loginAndExtractAccessToken(email, "Password123");
        createStudentProfile(token);
        return token;
    }

    private void createStudentProfile(String token) {
        restTemplate.exchange(
                url("/api/v1/students/me/profile"), HttpMethod.PUT,
                new org.springframework.http.HttpEntity<>(
                        Map.of("fullName", "Test Student", "phone", "+252600000000"), bearer(token)),
                Map.class);
    }

    private List<String> savedIds(String studentToken) {
        List<Map<String, Object>> content =
                (List<Map<String, Object>>) authorizedGet(SAVED, studentToken).getBody().get("content");
        return content.stream()
                .map(entry -> (String) ((Map<String, Object>) entry.get("opportunity")).get("id"))
                .toList();
    }

    private int savedRowCount(UUID opportunityId) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM student_saved_opportunities WHERE opportunity_id = ?", Integer.class, opportunityId);
    }

    private void suspend(UUID organizationId) {
        jdbcTemplate.update("UPDATE organizations SET verification_status = 'SUSPENDED' WHERE id = ?", organizationId);
    }

    private void reVerify(UUID organizationId) {
        jdbcTemplate.update("UPDATE organizations SET verification_status = 'VERIFIED' WHERE id = ?", organizationId);
    }

    private HttpStatus unauthenticated(HttpMethod method, String path) {
        return (HttpStatus) restTemplate.exchange(
                url(path), method, new org.springframework.http.HttpEntity<>(jsonHeaders()), Map.class).getStatusCode();
    }

    private org.springframework.http.HttpHeaders bearer(String token) {
        org.springframework.http.HttpHeaders headers = jsonHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private org.springframework.http.HttpHeaders jsonHeaders() {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        return headers;
    }
}
