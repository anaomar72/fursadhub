package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Legal documents, terms acceptance, consent and privacy requests (CLAUDE.md sections 49-50).
 *
 * <p>The distinction these tests exist to protect is the one CLAUDE.md section 49 insists on:
 * accepting the Terms is not consent to optional processing, and the two are recorded separately and
 * move independently.
 */
class ComplianceIT extends AbstractPhase7IT {

    // ---------------------------------------------------------------- legal documents

    @Test
    @DisplayName("Published legal documents are readable without authentication")
    void legalDocumentsArePublic() {
        Staff admin = superAdmin("legal-admin");
        publishLegalDocument(admin.token(), "TERMS", version("public"), "en", LocalDate.now().minusDays(1));

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/legal-documents/TERMS?locale=en");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("documentType")).isEqualTo("TERMS");
        assertThat(response.getBody().get("body")).isNotNull();
    }

    @Test
    @DisplayName("A Somali request falls back to English when no translation is published")
    void somaliFallsBackToEnglish() {
        Staff admin = superAdmin("locale-admin");
        publishLegalDocument(admin.token(), "COOKIE_POLICY", version("en-only"), "en", LocalDate.now().minusDays(1));

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/legal-documents/COOKIE_POLICY?locale=so");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        // The response says which language it actually is, so the UI can flag the fallback rather
        // than implying the text is translated.
        assertThat(response.getBody().get("locale")).isEqualTo("en");
    }

    @Test
    @DisplayName("A Somali version is served when one exists")
    void somaliIsServedWhenPublished() {
        Staff admin = superAdmin("so-admin");
        String sharedVersion = version("bilingual");
        publishLegalDocument(admin.token(), "PRIVACY_POLICY", sharedVersion, "en", LocalDate.now().minusDays(1));
        publishLegalDocument(admin.token(), "PRIVACY_POLICY", sharedVersion, "so", LocalDate.now().minusDays(1));

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/legal-documents/PRIVACY_POLICY?locale=so");

        assertThat(response.getBody().get("locale")).isEqualTo("so");
    }

    @Test
    @DisplayName("Publishing the same type, version and locale twice is refused")
    void versionsAreUnique() {
        Staff admin = superAdmin("dupe-legal");
        String sharedVersion = version("dupe");
        publishLegalDocument(admin.token(), "TERMS", sharedVersion, "en", LocalDate.now().minusDays(1));

        ResponseEntity<Map> response = authorizedPost("/api/v1/admin/legal-documents", admin.token(), Map.of(
                "documentType", "TERMS",
                "version", sharedVersion,
                "locale", "en",
                "title", "Terms",
                "body", "Rewritten body that must not silently replace the accepted one.",
                "effectiveFrom", LocalDate.now().toString()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("LEGAL_DOCUMENT_VERSION_EXISTS");
    }

    @Test
    @DisplayName("Only a super admin may publish a legal document")
    void publishingRequiresSuperAdmin() {
        Staff officer = verificationOfficer("legal-officer");

        ResponseEntity<Map> response = authorizedPost("/api/v1/admin/legal-documents", officer.token(), Map.of(
                "documentType", "TERMS",
                "version", version("officer"),
                "locale", "en",
                "title", "Terms",
                "body", "Body",
                "effectiveFrom", LocalDate.now().toString()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- terms acceptance

    @Test
    @DisplayName("A user is told what they still have to accept, and acceptance clears it")
    void acceptanceClearsTheOutstandingList() {
        Staff admin = superAdmin("terms-admin");
        UUID termsId = publishLegalDocument(
                admin.token(), "TERMS", version("accept"), "en", LocalDate.now().minusDays(1));
        String user = registerVerifiedAndLogin("terms-user");

        ResponseEntity<Map> before = authorizedGet("/api/v1/me/legal-status?locale=en", user);
        requireOk(before, "Legal status");
        assertThat(before.getBody().get("acceptanceRequired")).isEqualTo(true);

        requireOk(authorizedPost("/api/v1/me/terms-acceptances", user,
                Map.of("legalDocumentId", termsId.toString())), "Accept terms");

        assertThat(outstandingIds(user)).doesNotContain(termsId.toString());
    }

    @Test
    @DisplayName("Accepting twice records one acceptance, not two")
    void acceptanceIsIdempotent() {
        Staff admin = superAdmin("idem-terms");
        UUID termsId = publishLegalDocument(
                admin.token(), "TERMS", version("idem"), "en", LocalDate.now().minusDays(1));
        String user = registerVerifiedAndLogin("idem-terms-user");
        UUID userId = currentUserId(user);

        Map<String, Object> body = Map.of("legalDocumentId", termsId.toString());
        requireOk(authorizedPost("/api/v1/me/terms-acceptances", user, body), "First accept");
        requireOk(authorizedPost("/api/v1/me/terms-acceptances", user, body), "Second accept");

        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM terms_acceptances WHERE user_id = ? AND legal_document_id = ?",
                Integer.class, userId, termsId);
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("A newly published version becomes outstanding again for someone who accepted the old one")
    void newVersionRequiresFreshAcceptance() {
        Staff admin = superAdmin("newver-admin");
        UUID firstVersion = publishLegalDocument(
                admin.token(), "TERMS", version("v1"), "en", LocalDate.now().minusDays(5));
        String user = registerVerifiedAndLogin("newver-user");

        requireOk(authorizedPost("/api/v1/me/terms-acceptances", user,
                Map.of("legalDocumentId", firstVersion.toString())), "Accept v1");
        assertThat(outstandingIds(user)).doesNotContain(firstVersion.toString());

        // Effective TODAY, so it is unambiguously the current TERMS version.
        UUID secondVersion = publishLegalDocument(admin.token(), "TERMS", version("v2"), "en", LocalDate.now());

        // Accepting v1 says nothing about v2 — acceptance points at one exact version.
        assertThat(outstandingIds(user)).contains(secondVersion.toString());
    }

    @Test
    @DisplayName("A cookie notice never requires acceptance")
    void cookieNoticeIsInformationalOnly() {
        Staff admin = superAdmin("cookie-admin");
        UUID cookieId = publishLegalDocument(
                admin.token(), "COOKIE_POLICY", version("cookie"), "en", LocalDate.now().minusDays(1));
        String user = registerVerifiedAndLogin("cookie-user");

        // Published and readable, but never something the user is asked to accept.
        assertThat(outstandingIds(user)).doesNotContain(cookieId.toString());

        ResponseEntity<Map> response = authorizedPost("/api/v1/me/terms-acceptances", user,
                Map.of("legalDocumentId", cookieId.toString()));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("LEGAL_DOCUMENT_NOT_ACCEPTABLE");
    }

    /**
     * The ids this user still has to accept.
     *
     * <p>These tests share one database and every published TERMS version is global, so asserting on
     * the {@code acceptanceRequired} flag would make each test depend on what its siblings published.
     * Asserting on specific document ids is what the behaviour actually promises anyway: acceptance
     * points at one exact version.
     */
    private List<String> outstandingIds(String userToken) {
        ResponseEntity<Map> status = authorizedGet("/api/v1/me/legal-status?locale=en", userToken);
        requireOk(status, "Legal status");
        return ((List<?>) status.getBody().get("outstanding")).stream()
                .map(entry -> (String) ((Map<?, ?>) entry).get("id"))
                .toList();
    }

    // ---------------------------------------------------------------- consent

    @Test
    @DisplayName("Consent starts ungranted, and accepting the Terms does not grant it")
    void termsAcceptanceIsNotConsent() {
        Staff admin = superAdmin("consent-admin");
        UUID termsId = publishLegalDocument(
                admin.token(), "TERMS", version("consent"), "en", LocalDate.now().minusDays(1));
        String user = registerVerifiedAndLogin("consent-user");

        requireOk(authorizedPost("/api/v1/me/terms-acceptances", user,
                Map.of("legalDocumentId", termsId.toString())), "Accept terms");

        ResponseEntity<List> consents = authorizedGetList("/api/v1/me/consents", user);
        requireOk(consents, "Consents");

        assertThat(consents.getBody()).isNotEmpty();
        assertThat(consents.getBody()).allSatisfy(entry ->
                assertThat(((Map<?, ?>) entry).get("granted")).isEqualTo(false));
    }

    @Test
    @DisplayName("Consent can be granted and withdrawn, and withdrawal keeps the history")
    void consentCanBeWithdrawn() {
        String user = registerVerifiedAndLogin("withdraw-user");
        UUID userId = currentUserId(user);
        String path = "/api/v1/me/consents/PRODUCT_UPDATE_EMAIL";

        requireOk(authorizedPut(path, user, Map.of("granted", true)), "Grant consent");
        ResponseEntity<Map> withdrawn = authorizedPut(path, user, Map.of("granted", false));
        requireOk(withdrawn, "Withdraw consent");

        assertThat(withdrawn.getBody().get("granted")).isEqualTo(false);
        // Granting is still on the record — a withdrawal that erased it would destroy the evidence of
        // when processing should have stopped.
        assertThat(withdrawn.getBody().get("grantedAt")).isNotNull();
        assertThat(withdrawn.getBody().get("withdrawnAt")).isNotNull();

        Integer rows = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM consent_records WHERE user_id = ?", Integer.class, userId);
        assertThat(rows).isEqualTo(1);
    }

    // ---------------------------------------------------------------- privacy requests

    @Test
    @DisplayName("A user submits a privacy request and an admin completes it")
    void privacyRequestLifecycle() {
        Staff admin = superAdmin("privacy-admin");
        String user = registerVerifiedAndLogin("privacy-user");
        UUID userId = currentUserId(user);

        ResponseEntity<Map> submitted = authorizedPost("/api/v1/me/privacy-requests", user,
                Map.of("requestType", "ACCESS", "details", "Please send me a copy of my data."));
        requireOk(submitted, "Submit privacy request");
        UUID requestId = UUID.fromString((String) submitted.getBody().get("id"));
        assertThat(submitted.getBody().get("state")).isEqualTo("SUBMITTED");
        assertThat(countNotifications(userId, "PRIVACY_REQUEST_RECEIVED")).isEqualTo(1);

        requireOk(authorizedPost("/api/v1/admin/privacy-requests/" + requestId + "/begin-review",
                admin.token(), null), "Begin review");
        ResponseEntity<Map> completed = authorizedPost(
                "/api/v1/admin/privacy-requests/" + requestId + "/complete", admin.token(),
                Map.of("note", "Data export sent by secure email."));
        requireOk(completed, "Complete");

        assertThat(completed.getBody().get("state")).isEqualTo("COMPLETED");
        assertThat(countNotifications(userId, "PRIVACY_REQUEST_COMPLETED")).isEqualTo(1);
    }

    @Test
    @DisplayName("A resolved privacy request cannot be reopened or resolved again")
    void resolutionIsFinal() {
        Staff admin = superAdmin("final-privacy");
        String user = registerVerifiedAndLogin("final-privacy-user");

        ResponseEntity<Map> submitted = authorizedPost("/api/v1/me/privacy-requests", user,
                Map.of("requestType", "ERASURE", "details", "Delete my account data."));
        requireOk(submitted, "Submit");
        UUID requestId = UUID.fromString((String) submitted.getBody().get("id"));

        requireOk(authorizedPost("/api/v1/admin/privacy-requests/" + requestId + "/reject", admin.token(),
                Map.of("note", "Records are tied to an active placement.")), "Reject");

        ResponseEntity<Map> again = authorizedPost(
                "/api/v1/admin/privacy-requests/" + requestId + "/complete", admin.token(),
                Map.of("note", "Changed my mind"));

        assertThat(again.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(again)).isEqualTo("PRIVACY_REQUEST_INVALID_TRANSITION");
    }

    @Test
    @DisplayName("Rejecting a privacy request without a reason is refused")
    void rejectionRequiresAReason() {
        Staff admin = superAdmin("noreason-admin");
        String user = registerVerifiedAndLogin("noreason-user");

        ResponseEntity<Map> submitted = authorizedPost("/api/v1/me/privacy-requests", user,
                Map.of("requestType", "OBJECTION", "details", "I object."));
        requireOk(submitted, "Submit");
        UUID requestId = UUID.fromString((String) submitted.getBody().get("id"));

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/privacy-requests/" + requestId + "/reject", admin.token(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    @DisplayName("A user sees only their own privacy requests")
    void privacyRequestsAreSelfService() {
        String first = registerVerifiedAndLogin("mine-privacy");
        String second = registerVerifiedAndLogin("theirs-privacy");

        requireOk(authorizedPost("/api/v1/me/privacy-requests", first,
                Map.of("requestType", "PORTABILITY", "details", "Export please.")), "Submit");

        ResponseEntity<List> theirs = authorizedGetList("/api/v1/me/privacy-requests", second);
        requireOk(theirs, "Their requests");
        assertThat(theirs.getBody()).isEmpty();
    }

    @Test
    @DisplayName("An ordinary user cannot reach the privacy-request queue")
    void queueRequiresSuperAdmin() {
        String user = registerVerifiedAndLogin("queue-probe");

        assertThat(authorizedGet("/api/v1/admin/privacy-requests", user).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    /** Versions must be unique per type+locale, and these tests share one database. */
    private String version(String label) {
        return label + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
