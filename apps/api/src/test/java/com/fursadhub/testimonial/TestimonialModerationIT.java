package com.fursadhub.testimonial;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The one property that matters for this feature: nothing an author can do puts words on the public
 * site. Everything else here exists to prove that property cannot be routed around.
 *
 * <p>Assertions are keyed on a specific testimonial id rather than on the public list being empty,
 * because these tests share one database with each other and with the rest of the suite.
 *
 * <p>Attribution itself — which role a quote is published under, and that the author cannot choose
 * it — lives in {@link TestimonialRoleAttributionIT}.
 */
class TestimonialModerationIT extends AbstractPhase7IT {

    private static final String PUBLIC = "/api/v1/public/testimonials";
    private static final String MINE = "/api/v1/me/testimonial";

    private Map<String, Object> submission(String name, String body) {
        return submission(name, body, 4);
    }

    /**
     * A submission payload. Note what it does NOT carry: a role and an affiliation. Those were
     * removed from the request contract entirely — the server derives them — so these tests could
     * not smuggle an attribution in even if they tried.
     */
    private Map<String, Object> submission(String name, String body, Integer rating) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("authorDisplayName", name);
        payload.put("body", body);
        // HashMap rather than Map.of so a deliberately absent rating can be expressed as null.
        payload.put("rating", rating);
        return payload;
    }

    @Test
    void submittedTestimonialsAreInvisiblePubliclyUntilAModeratorPublishesThem() {
        String quote = "FursadHub matched me with an internship that actually used what I studied.";
        String author = studentAuthor("testimonial-author");

        ResponseEntity<Map> submitted = authorizedPost(MINE, author, submission("Amina H.", quote));
        assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(submitted.getBody().get("status")).isEqualTo("SUBMITTED");
        UUID id = UUID.fromString((String) submitted.getBody().get("id"));

        // Submitting changed nothing on the public site.
        assertThat(publicIds()).doesNotContain(id.toString());
        assertThat(publicBodies()).doesNotContain(quote);

        var admin = platformAdmin("testimonial-mod", "SUPER_ADMIN");
        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", admin.token(), null),
                "Publish");
        assertThat(publicBodies()).contains(quote);

        // Unpublishing removes it from the public site without destroying the record.
        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/unpublish", admin.token(),
                Map.of("note", "Checking attribution")), "Unpublish");
        assertThat(publicIds()).doesNotContain(id.toString());

        // The author can still see their own row, and sees that it is back in review.
        ResponseEntity<List> mine = authorizedGetList(MINE, author);
        assertThat(mine.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mine.getBody()).hasSize(1);
        assertThat(((Map<?, ?>) mine.getBody().get(0)).get("status")).isEqualTo("SUBMITTED");
    }

    @Test
    void anAuthorCannotModerateAndANonAdminCannotReachTheQueue() {
        String author = studentAuthor("testimonial-selfpublish");
        UUID id = UUID.fromString((String) authorizedPost(MINE, author,
                submission("Yusuf A.", "A recruiter replied within two days of my application."))
                .getBody().get("id"));

        // The author holds a valid token and knows their own testimonial id. That is not enough.
        assertThat(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", author, null)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/testimonials", author).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(unauthenticatedGet("/api/v1/admin/testimonials").getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(publicIds()).doesNotContain(id.toString());
    }

    @Test
    void rejectedTestimonialsStayOffTheSiteAndRequireAReason() {
        String author = studentAuthor("testimonial-rejected");
        UUID id = UUID.fromString((String) authorizedPost(MINE, author,
                submission("Hodan M.", "Our coordinators track every placement in one queue."))
                .getBody().get("id"));
        var admin = platformAdmin("testimonial-rejecter", "SUPER_ADMIN");

        ResponseEntity<Map> unexplained = authorizedPost(
                "/api/v1/admin/testimonials/" + id + "/reject", admin.token(), Map.of());
        assertThat(unexplained.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(unexplained.getBody().get("code")).isEqualTo("VALIDATION_FAILED");

        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/reject", admin.token(),
                Map.of("note", "Could not confirm the placement")), "Reject");
        assertThat(publicIds()).doesNotContain(id.toString());

        // A rejected row is terminal: it cannot be resurrected into publication.
        assertThat(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", admin.token(), null)
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(publicIds()).doesNotContain(id.toString());
    }

    @Test
    void oneLiveTestimonialPerAuthor() {
        String author = studentAuthor("testimonial-duplicate");
        Map<String, Object> body = submission("Sagal O.",
                "We filled three internship openings without running our own campus process.");
        requireOk(authorizedPost(MINE, author, body), "First");
        ResponseEntity<Map> second = authorizedPost(MINE, author, body);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(second.getBody().get("code")).isEqualTo("TESTIMONIAL_ALREADY_SUBMITTED");
    }

    @Test
    void thePublicResponseCarriesNoAccountOrModerationDetail() {
        UUID universityId = insertVerifiedUniversity("Shape University");
        UUID departmentId = insertDepartment(universityId, "Information Technology", "IT-SHAPE");
        var student = createVerifiedStudent("testimonial-shape", universityId, departmentId);

        UUID id = UUID.fromString((String) authorizedPost(MINE, student.accessToken(),
                submission("Khadra I.", "The weekly log kept my supervisor and me on the same page."))
                .getBody().get("id"));
        var admin = platformAdmin("testimonial-shape-mod", "SUPER_ADMIN");
        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", admin.token(), null),
                "Publish");

        Map<String, Object> published = publicList().stream()
                .filter(row -> id.toString().equals(row.get("id")))
                .findFirst().orElseThrow();
        // The exact public surface. Notably absent: authorUserId, status, moderatedAt,
        // moderationNote, submittedAt, and the internal tenant UUID behind the affiliation name.
        assertThat(published.keySet())
                .containsExactlyInAnyOrder("id", "authorDisplayName", "authorRole", "authorAudience",
                        "authorAffiliation", "body", "rating");
        assertThat(published.get("authorAffiliation")).isEqualTo("Shape University");

        // Leave the shared public list as this test found it.
        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/unpublish", admin.token(),
                Map.of()), "Unpublish");
    }

    // ------------------------------------------------------------------ rating

    @Test
    void aNewTestimonialMustCarryARealRatingBetweenOneAndFive() {
        String author = studentAuthor("testimonial-rating-required");
        String quote = "The application tracker told me exactly where each of my applications stood.";

        // Absent.
        ResponseEntity<Map> missing = authorizedPost(MINE, author, submission("Ifrah A.", quote, null));
        assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(missing.getBody().get("code")).isEqualTo("VALIDATION_FAILED");

        // Below the range.
        assertThat(authorizedPost(MINE, author, submission("Ifrah A.", quote, 0))
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // Above the range.
        assertThat(authorizedPost(MINE, author, submission("Ifrah A.", quote, 6))
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // None of the refusals created a row, so the author is still free to submit properly.
        ResponseEntity<Map> accepted = authorizedPost(MINE, author, submission("Ifrah A.", quote, 5));
        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accepted.getBody().get("rating")).isEqualTo(5);
        assertThat(accepted.getBody().get("status")).isEqualTo("SUBMITTED");
    }

    @Test
    void theAuthorsOwnRatingSurvivesUnchangedToThePublicCard() {
        var admin = platformAdmin("testimonial-rating-mod", "SUPER_ADMIN");

        record Case(String slug, String name, String quote, int rating) {
        }
        List<Case> cases = List.of(
                new Case("rating-five", "Mustafe D.",
                        "My university verified my enrollment and I applied the same afternoon.", 5),
                new Case("rating-four", "Layla K.",
                        "We reviewed nominated candidates beside public applicants in one pipeline.", 4),
                new Case("rating-three", "Bashir O.",
                        "Every placement our department supervises now reports through one workflow.", 3));

        for (Case testCase : cases) {
            String author = studentAuthor(testCase.slug());
            ResponseEntity<Map> submitted = authorizedPost(MINE, author,
                    submission(testCase.name(), testCase.quote(), testCase.rating()));
            assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(submitted.getBody().get("rating")).isEqualTo(testCase.rating());

            UUID id = UUID.fromString((String) submitted.getBody().get("id"));

            // Still not public, rating or no rating.
            assertThat(publicIds()).doesNotContain(id.toString());

            requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", admin.token(), null),
                    "Publish " + testCase.slug());

            Map<String, Object> published = publicList().stream()
                    .filter(row -> id.toString().equals(row.get("id")))
                    .findFirst().orElseThrow();
            // The author's OWN number reaches the card — not a default, and not rounded to five.
            assertThat(published.get("rating")).isEqualTo(testCase.rating());

            requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/unpublish", admin.token(),
                    Map.of()), "Unpublish " + testCase.slug());
        }
    }

    @Test
    void aTestimonialWrittenBeforeRatingsExistedKeepsNoRatingAndIsNeverBackfilled() {
        String author = studentAuthor("testimonial-legacy-rating");
        UUID id = UUID.fromString((String) authorizedPost(MINE, author,
                submission("Nasra Y.", "The final report and defense steps were laid out before I started."))
                .getBody().get("id"));

        // Reproduce a pre-V51 row: the column is nullable precisely so these can exist, and V51
        // backfills nothing. Going through SQL is the only way to make one, because the domain
        // factory now refuses an unrated testimonial.
        jdbcTemplate.update("UPDATE testimonials SET rating = NULL WHERE id = ?", id);

        var admin = platformAdmin("testimonial-legacy-mod", "SUPER_ADMIN");
        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/publish", admin.token(), null),
                "Publish");

        Map<String, Object> published = publicList().stream()
                .filter(row -> id.toString().equals(row.get("id")))
                .findFirst().orElseThrow();
        // No rating reaches the client at all. The API is configured with
        // `default-property-inclusion: non_null`, so an absent rating is an absent key rather than
        // an explicit null — either way the value reads as null here, and that is what the frontend
        // uses to omit the star row. What matters is the negative: never 0, never 5, never an
        // invented default standing in for a score this author did not give.
        assertThat(published.get("rating")).isNull();
        assertThat(published).doesNotContainKey("rating");

        requireOk(authorizedPost("/api/v1/admin/testimonials/" + id + "/unpublish", admin.token(),
                Map.of()), "Unpublish");
    }

    @Test
    void theRatingRangeIsEnforcedByTheDatabaseAndNotOnlyByJava() {
        String author = studentAuthor("testimonial-rating-check");
        UUID id = UUID.fromString((String) authorizedPost(MINE, author,
                submission("Deeqa S.", "My supervisor signed off each weekly log without a single email thread."))
                .getBody().get("id"));

        // Bypassing the application entirely still cannot store a rating of 9 (CLAUDE.md section 52).
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE testimonials SET rating = 9 WHERE id = ?", id))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * A signed-in account that is genuinely a student, which is now the minimum for submitting at
     * all: attribution is derived, and an account with no profile and no membership has no role to
     * derive. No enrollment, so this author publishes as "Student" with no institution beside them.
     */
    private String studentAuthor(String prefix) {
        String token = registerVerifiedAndLogin(prefix);
        requireOk(authorizedPut("/api/v1/students/me/profile", token,
                Map.of("fullName", "Student " + prefix, "phone", "+252612345678")), "Student profile");
        return token;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> publicList() {
        ResponseEntity<List> response = restTemplate.getForEntity(url(PUBLIC), List.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private List<String> publicIds() {
        return publicList().stream().map(row -> (String) row.get("id")).toList();
    }

    private List<String> publicBodies() {
        return publicList().stream().map(row -> (String) row.get("body")).toList();
    }
}
