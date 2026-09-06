package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B6 — platform-wide opportunity oversight for Super Admins.
 *
 * <p>The invariant this file exists to protect is a DIFFERENCE, not a capability: administrative
 * visibility and public discoverability are separate questions, and B6 must widen the first without
 * touching the second by so much as a row. Every "the admin can see it" test here is paired with a
 * "the public still cannot" assertion, because a read endpoint that quietly relaxed Backend Phase
 * B1.5 would be indistinguishable from this one until a suspended organization's listings turned up
 * on the public site.
 */
@SuppressWarnings("unchecked")
class AdminOpportunityQueryIT extends AbstractPhase7IT {

    private static final String ADMIN_OPPORTUNITIES = "/api/v1/admin/opportunities";

    // ---------------------------------------------------------------- administrative visibility

    /**
     * Backend Phase B6 section 2. Public discovery shows PUBLISHED PUBLIC/HYBRID only; oversight
     * shows the lifecycle. A console that hid drafts and cancellations could not answer the questions
     * an operator actually opens it to ask.
     */
    @Test
    @DisplayName("A Super Admin sees every lifecycle state, including ones the public never sees")
    void everyLifecycleStateIsVisibleAdministratively() {
        Staff root = superAdmin("b6-states");
        Fixture fixture = organizationWithOpportunities("b6-states");

        List<Map<String, Object>> rows = rowsFor(root.token(), "?organizationId=" + fixture.organizationId());

        assertThat(rows).extracting(row -> row.get("status"))
                .containsExactlyInAnyOrder("DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "CANCELLED");
    }

    /**
     * A UNIVERSITY_TARGETED opportunity is never publicly discoverable by design — it sources
     * candidates only through nominations. It is still a real listing the platform must be able to
     * see.
     */
    @Test
    @DisplayName("A targeted-only opportunity is administratively visible but not publicly discoverable")
    void targetedOnlyOpportunitiesAreVisibleButNotDiscoverable() {
        Staff root = superAdmin("b6-targeted");
        String recruiter = registerVerifiedAndLogin(emailPrefix("b6-targeted-rec"));
        UUID organizationId = createVerifiedOrganization(recruiter, "B6 Targeted Co");
        UUID opportunityId = createDraftOpportunity(recruiter, organizationId, "UNIVERSITY_TARGETED", Map.of());
        // A targeted opportunity cannot publish without naming a university — the domain refuses it,
        // so the fixture has to build a real one rather than a plausible-looking row.
        UUID universityId = insertVerifiedUniversity("B6 Targeted University " + UUID.randomUUID().toString().substring(0, 8));
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS" + System.nanoTime() % 100000);
        addTarget(recruiter, opportunityId, universityId, List.of(departmentId), 5);
        publishOpportunity(recruiter, opportunityId);

        Map<String, Object> row = rowById(root.token(), organizationId, opportunityId);

        assertThat(row.get("status")).isEqualTo("PUBLISHED");
        assertThat(row.get("mode")).isEqualTo("UNIVERSITY_TARGETED");
        assertThat(row.get("publiclyDiscoverable")).isEqualTo(false);
        assertThat(publicListContains(opportunityId)).isFalse();
    }

    // ---------------------------------------------------------------- public visibility regression

    /**
     * Backend Phase B6 section 18 — the launch-critical one, walked end to end.
     *
     * <p>Suspending an organization must hide its listings from the public WITHOUT changing their
     * stored state, and re-verifying must restore them with no repair pass. B6 adds a surface that
     * can see through that hiding; this proves it does not disable it.
     */
    @Test
    @DisplayName("Suspending an organization hides a listing publicly, never administratively")
    void suspensionHidesPubliclyAndNeverAdministratively() {
        Staff root = superAdmin("b6-suspend");
        String recruiter = registerVerifiedAndLogin(emailPrefix("b6-suspend-rec"));
        UUID organizationId = createVerifiedOrganization(recruiter, "B6 Suspension Co");
        UUID opportunityId = createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiter, opportunityId);

        // 1-2. Verified organization: publicly discoverable, and the admin row agrees.
        assertThat(publicListContains(opportunityId)).isTrue();
        assertThat(rowById(root.token(), organizationId, opportunityId).get("publiclyDiscoverable")).isEqualTo(true);

        // 3. Suspend the organization.
        setOrganizationVerification(organizationId, "SUSPENDED");

        // 4. The public loses it — list AND direct lookup.
        assertThat(publicListContains(opportunityId)).isFalse();
        assertThat(unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);

        // 5. The administrator does not, and the row explains WHY it is hidden rather than
        //    leaving an operator to guess.
        Map<String, Object> hidden = rowById(root.token(), organizationId, opportunityId);
        assertThat(hidden.get("status")).as("stored state is untouched").isEqualTo("PUBLISHED");
        assertThat(hidden.get("publiclyDiscoverable")).isEqualTo(false);
        assertThat(hidden.get("organizationVerificationStatus")).isEqualTo("SUSPENDED");
        assertThat(opportunityStatusInDatabase(opportunityId)).isEqualTo("PUBLISHED");

        // 6. Re-verification restores public behaviour with nothing rewritten.
        setOrganizationVerification(organizationId, "VERIFIED");
        assertThat(publicListContains(opportunityId)).isTrue();
        assertThat(rowById(root.token(), organizationId, opportunityId).get("publiclyDiscoverable")).isEqualTo(true);
        assertThat(opportunityStatusInDatabase(opportunityId)).isEqualTo("PUBLISHED");
    }

    // ---------------------------------------------------------------- filters and search

    @Test
    @DisplayName("Status and mode filters narrow at the database, and totals follow the filter")
    void filtersNarrowAtTheDatabase() {
        Staff root = superAdmin("b6-filter");
        Fixture fixture = organizationWithOpportunities("b6-filter");
        String scope = "?organizationId=" + fixture.organizationId();

        assertThat(rowsFor(root.token(), scope + "&status=DRAFT")).singleElement()
                .satisfies(row -> assertThat(row.get("status")).isEqualTo("DRAFT"));
        assertThat(rowsFor(root.token(), scope + "&status=CANCELLED")).singleElement()
                .satisfies(row -> assertThat(row.get("status")).isEqualTo("CANCELLED"));

        // totalElements must describe the FILTERED query, not the table.
        Map<String, Object> filtered = pageFor(root.token(), scope + "&status=DRAFT");
        assertThat(((Number) filtered.get("totalElements")).intValue()).isEqualTo(1);

        // Every opportunity in this fixture is PUBLIC mode, so a mode filter that matches none is
        // genuinely empty rather than falling back to everything.
        assertThat(rowsFor(root.token(), scope + "&mode=UNIVERSITY_TARGETED")).isEmpty();
        assertThat(rowsFor(root.token(), scope + "&mode=PUBLIC")).hasSize(5);
    }

    /**
     * Backend Phase B6 section 11. Organization-name search runs as a correlated subquery inside the
     * one statement — no organizations are loaded into memory to be filtered in Java.
     */
    @Test
    @DisplayName("Search matches an opportunity title and an owning organization's name")
    void searchMatchesTitleAndOrganizationName() {
        Staff root = superAdmin("b6-search");
        String recruiter = registerVerifiedAndLogin(emailPrefix("b6-search-rec"));
        String organizationName = "Hormuud Telecom " + UUID.randomUUID().toString().substring(0, 8);
        UUID organizationId = createVerifiedOrganization(recruiter, organizationName);
        UUID opportunityId = createDraftOpportunity(
                recruiter, organizationId, "PUBLIC", Map.of("title", "Cartography Analyst Intern"));

        // By title fragment, case-insensitively.
        assertThat(idsFor(root.token(), "?query=cartography analyst")).contains(opportunityId.toString());
        // By the OWNING ORGANIZATION's name, which is not a column on the opportunity at all.
        assertThat(idsFor(root.token(), "?query=" + organizationName.split(" ")[1])).contains(opportunityId.toString());
        // A fragment matching neither returns nothing rather than everything.
        assertThat(idsFor(root.token(), "?query=zzzznomatchzzzz")).isEmpty();
    }

    /** The body is a 4000-character column with no usable index — deliberately not searched. */
    @Test
    @DisplayName("Search does not scan opportunity descriptions")
    void searchDoesNotScanDescriptions() {
        Staff root = superAdmin("b6-search-desc");
        String recruiter = registerVerifiedAndLogin(emailPrefix("b6-search-desc-rec"));
        UUID organizationId = createVerifiedOrganization(recruiter, "B6 Description Co");
        String marker = "zx" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        createDraftOpportunity(recruiter, organizationId, "PUBLIC",
                Map.of("description", "This description mentions " + marker + " exactly once."));

        assertThat(idsFor(root.token(), "?query=" + marker)).isEmpty();
    }

    // ---------------------------------------------------------------- detail

    @Test
    @DisplayName("Detail opens a draft the public cannot see, and carries the B3 enrichment")
    void detailOpensANonPublicOpportunity() {
        Staff root = superAdmin("b6-detail");
        String recruiter = registerVerifiedAndLogin(emailPrefix("b6-detail-rec"));
        UUID organizationId = createVerifiedOrganization(recruiter, "B6 Detail Co");
        UUID draftId = createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of(
                "hoursPerWeek", 20,
                "skills", List.of("Java", "SQL"),
                "perks", List.of("Transport allowance")));

        ResponseEntity<Map> response = authorizedGet(ADMIN_OPPORTUNITIES + "/" + draftId, root.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> detail = response.getBody();
        assertThat(((Map<String, Object>) detail.get("summary")).get("status")).isEqualTo("DRAFT");
        assertThat(detail.get("hoursPerWeek")).isEqualTo(20);
        assertThat((List<String>) detail.get("skills")).containsExactly("Java", "SQL");
        assertThat((List<String>) detail.get("perks")).containsExactly("Transport allowance");
        // The public route refuses the same id — B6 did not widen public discovery.
        assertThat(unauthenticatedGet("/api/v1/public/opportunities/" + draftId).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("An unknown opportunity id is a not-found, not a server error")
    void anUnknownIdIsNotFound() {
        Staff root = superAdmin("b6-missing");

        ResponseEntity<Map> response = authorizedGet(ADMIN_OPPORTUNITIES + "/" + UUID.randomUUID(), root.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_NOT_FOUND");
    }

    // ---------------------------------------------------------------- privacy

    /**
     * Backend Phase B6 section 19. An allowlist, not a denylist: EVERY row must draw its keys from
     * this set, so a field added later — a candidacy count, an applicant list, a stored-file id —
     * fails this test rather than shipping.
     *
     * <p>Subset rather than exact match because the API serializes with {@code non_null} inclusion:
     * a DRAFT row legitimately omits {@code publishedAt}, and an opportunity with no deadline omits
     * {@code applicationDeadline}. Absence is never a leak; presence of something unlisted is, which
     * is what this pins. The published row below then proves the fields do appear when they exist.
     */
    @Test
    @DisplayName("Every admin row draws only from the operational allowlist")
    void theAdminRowIsAnAllowlist() {
        Staff root = superAdmin("b6-privacy");
        Fixture fixture = organizationWithOpportunities("b6-privacy");
        List<String> allowed = List.of(
                "id", "organizationId", "organizationName", "organizationVerificationStatus", "title",
                "status", "mode", "workMode", "location", "numberOfOpenings",
                "startDate", "endDate", "applicationDeadline", "createdAt", "publishedAt",
                "publiclyDiscoverable");

        List<Map<String, Object>> rows = rowsFor(root.token(), "?organizationId=" + fixture.organizationId());

        assertThat(rows).hasSize(5).allSatisfy(row ->
                assertThat(row.keySet()).as("row %s", row.get("status")).isSubsetOf(allowed));

        // The published row carries the full operational picture, so the allowlist is not passing
        // merely because the DTO returns almost nothing.
        Map<String, Object> published = rowById(root.token(), fixture.organizationId(), fixture.publishedId());
        assertThat(published.keySet()).containsAll(allowed);
    }

    /**
     * The same allowlist for detail, with a real applicant and real screening data planted around the
     * opportunity first — so the assertion is that this DTO does not reach them, not merely that
     * there was nothing to reach.
     */
    @Test
    @DisplayName("Detail exposes no applicant, screening, student or file data even when it exists")
    void detailNeverExposesPrivateDataAroundTheOpportunity() {
        Staff root = superAdmin("b6-privacy-detail");
        Fixture fixture = candidateApplied("b6-privacy-detail");

        Map<String, Object> detail = authorizedGet(
                ADMIN_OPPORTUNITIES + "/" + fixture.publishedId(), root.token()).getBody();

        // Subset, for the same non_null reason as the row allowlist: this fixture states no
        // compensation and no weekly hours, so those keys are legitimately absent. What must never
        // appear is anything OUTSIDE this set.
        assertThat(detail.keySet()).isSubsetOf(
                "summary", "description", "responsibilities", "requirements",
                "compensation", "skills", "perks", "hoursPerWeek");

        // Nothing about the applicant appears anywhere in the serialized payload.
        String serialized = detail.toString();
        assertThat(serialized).doesNotContain(fixture.studentEmail());
        assertThat(serialized).doesNotContainIgnoringCase("candidac");
        assertThat(serialized).doesNotContainIgnoringCase("screening");
        assertThat(serialized).doesNotContainIgnoringCase("storedFile");
        assertThat(serialized).doesNotContainIgnoringCase("createdBy");
    }

    // ---------------------------------------------------------------- authorization

    /**
     * Backend Phase B6 section 10/17. A verification officer reviews institutions; nothing about that
     * job requires reading every draft internship on the platform, so the existing
     * reviewer/super-admin split is preserved rather than widened because a new endpoint appeared.
     */
    @Test
    @DisplayName("Only a Super Admin reaches the opportunity oversight endpoints")
    void onlySuperAdminsReachOversight() {
        Staff root = superAdmin("b6-auth-root");
        Fixture fixture = organizationWithOpportunities("b6-auth");
        String detailPath = ADMIN_OPPORTUNITIES + "/" + fixture.publishedId();

        Staff officer = verificationOfficer("b6-auth-officer");
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES, officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet(detailPath, officer.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // The organization that OWNS these opportunities still cannot use the platform surface.
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES, fixture.recruiterToken()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet(detailPath, fixture.recruiterToken()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        // A university admin.
        String universityAdmin = registerVerifiedAndLogin(emailPrefix("b6-auth-uni"));
        UUID universityId = insertVerifiedUniversity("B6 Auth University");
        insertUniversityMembership(universityId, currentUserId(universityAdmin), "UNIVERSITY_ADMIN", List.of());
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES, universityAdmin).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        // An ordinary student account.
        String student = registerVerifiedAndLogin(emailPrefix("b6-auth-student"));
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES, student).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet(detailPath, student).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // Anonymous.
        assertThat(unauthenticatedGet(ADMIN_OPPORTUNITIES).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unauthenticatedGet(detailPath).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // And the Super Admin does reach both, so the test cannot pass by the routes being broken.
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES, root.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(authorizedGet(detailPath, root.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    /** B6 is read-only. Nothing on this resource accepts a write, in any state. */
    @Test
    @DisplayName("The oversight resource accepts no mutation")
    void oversightAcceptsNoMutation() {
        Staff root = superAdmin("b6-readonly");
        Fixture fixture = organizationWithOpportunities("b6-readonly");
        String detailPath = ADMIN_OPPORTUNITIES + "/" + fixture.publishedId();

        for (String path : List.of(ADMIN_OPPORTUNITIES, detailPath, detailPath + "/publish", detailPath + "/cancel")) {
            HttpStatus status = (HttpStatus) authorizedPost(path, root.token(), Map.of()).getStatusCode();
            assertThat(status)
                    .as("POST %s must not be a handled mutation", path)
                    .isIn(HttpStatus.METHOD_NOT_ALLOWED, HttpStatus.NOT_FOUND);
        }
        // The listing's state is unchanged by the attempts.
        assertThat(opportunityStatusInDatabase(fixture.publishedId())).isEqualTo("PUBLISHED");
    }

    // ---------------------------------------------------------------- query-parameter checklist

    /**
     * Backend Phase B6 section 21. Absent, blank, malformed and oversized inputs — the payloads that
     * say nothing, which is the family of bug this project keeps finding.
     */
    @Test
    @DisplayName("Absent, blank, malformed and oversized query parameters behave predictably")
    void queryParametersHandleEmptyAndMalformedInput() {
        Staff root = superAdmin("b6-params");
        organizationWithOpportunities("b6-params");

        // Absent: everything, paged.
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES, root.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        // Blank and whitespace-only query must NOT narrow — and must not throw.
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "?query=", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "?query=%20%20", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        // An unknown enum is refused rather than silently ignored — an ignored filter would hand back
        // the whole platform to someone who believed they had narrowed it.
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "?status=NOT_A_STATUS", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "?mode=NOT_A_MODE", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // A malformed UUID likewise.
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "?organizationId=not-a-uuid", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "/not-a-uuid", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        // An oversized page is capped rather than honoured, and an unknown sort property is ignored
        // rather than reaching the query as an entity field name.
        Map<String, Object> capped = pageFor(root.token(), "?size=5000");
        assertThat(((Number) capped.get("size")).intValue()).isEqualTo(50);
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "?sort=password,desc", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedGet(ADMIN_OPPORTUNITIES + "?page=-1", root.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- fixtures

    private record Fixture(UUID organizationId, String recruiterToken, UUID publishedId, String studentEmail) {
    }

    /** One organization owning exactly one opportunity in each of the five lifecycle states. */
    private Fixture organizationWithOpportunities(String prefix) {
        String recruiter = registerVerifiedAndLogin(emailPrefix(prefix + "-rec"));
        UUID organizationId = createVerifiedOrganization(recruiter, "B6 Co " + UUID.randomUUID().toString().substring(0, 8));

        createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of());

        UUID published = createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiter, published);

        UUID paused = createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiter, paused);
        transition(recruiter, paused, "pause");

        UUID closed = createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiter, closed);
        transition(recruiter, closed, "close");

        UUID cancelled = createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of());
        transition(recruiter, cancelled, "cancel");

        return new Fixture(organizationId, recruiter, published, null);
    }

    /** A published opportunity with a real applicant behind it, for the privacy assertions. */
    private Fixture candidateApplied(String prefix) {
        Fixture base = organizationWithOpportunities(prefix);
        UUID universityId = insertVerifiedUniversity("B6 Privacy University " + UUID.randomUUID().toString().substring(0, 8));
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS" + System.nanoTime() % 100000);
        StudentFixture student = createStudent(prefix + "-student", universityId, departmentId, "VERIFIED");
        requireOk(authorizedPost(
                "/api/v1/opportunities/" + base.publishedId() + "/applications", student.accessToken(), Map.of()),
                "Apply to opportunity");
        return new Fixture(base.organizationId(), base.recruiterToken(), base.publishedId(), student.email());
    }

    private void transition(String token, UUID opportunityId, String command) {
        requireOk(authorizedPost("/api/v1/opportunities/" + opportunityId + "/" + command, token, null), command);
    }

    private void setOrganizationVerification(UUID organizationId, String status) {
        jdbcTemplate.update("UPDATE organizations SET verification_status = ? WHERE id = ?", status, organizationId);
    }

    private String opportunityStatusInDatabase(UUID opportunityId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM internship_opportunities WHERE id = ?", String.class, opportunityId);
    }

    private Map<String, Object> pageFor(String token, String queryString) {
        ResponseEntity<Map> response = authorizedGet(ADMIN_OPPORTUNITIES + queryString, token);
        requireOk(response, "Admin opportunity list");
        return response.getBody();
    }

    private List<Map<String, Object>> rowsFor(String token, String queryString) {
        return (List<Map<String, Object>>) pageFor(token, queryString).get("content");
    }

    private List<String> idsFor(String token, String queryString) {
        return rowsFor(token, queryString).stream().map(row -> (String) row.get("id")).toList();
    }

    private Map<String, Object> rowById(String token, UUID organizationId, UUID opportunityId) {
        return rowsFor(token, "?organizationId=" + organizationId).stream()
                .filter(row -> opportunityId.toString().equals(row.get("id")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("opportunity " + opportunityId + " not in the admin list"));
    }

    private boolean publicListContains(UUID opportunityId) {
        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities?size=50");
        requireOk(response, "Public opportunity list");
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
        return content.stream().anyMatch(row -> opportunityId.toString().equals(row.get("id")));
    }
}
