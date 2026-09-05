package com.fursadhub.opportunity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B3 — structured internship data: compensation, skills, perks and weekly commitment.
 *
 * <p>Covers the write path (create, update, validation, normalisation, update-compatibility) and the
 * read path (management detail, management list, public detail, public listing), plus the
 * invariants B3 must not disturb: the DRAFT-only editing rule, opportunity RBAC, and the B1.5
 * verified-organization requirement for public discovery.
 */
@SuppressWarnings("unchecked")
class OpportunityEnrichmentIT extends AbstractPhase3IT {

    // ---------------------------------------------------------------- backward compatibility

    /**
     * The migration is additive: an opportunity created with only the pre-B3 fields must still be
     * creatable, readable and publishable, reading as having no compensation, no skills, no perks
     * and no stated weekly commitment.
     */
    @Test
    void opportunityCreatedWithoutTheNewFieldsRemainsValid() {
        String token = registerAndLogin("b3-legacy");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Legacy Org"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", Map.of());

        Map<String, Object> body = authorizedGet("/api/v1/opportunities/" + opportunityId, token).getBody();

        assertThat(body).doesNotContainKeys("compensation", "hoursPerWeek");
        // Empty lists are returned as [], not omitted: the opportunity exists and has no skills.
        assertThat((List<String>) body.get("skills")).isEmpty();
        assertThat((List<String>) body.get("perks")).isEmpty();
    }

    // ---------------------------------------------------------------- create

    @Test
    void everyNewFieldCanBeSetAtCreation() {
        String token = registerAndLogin("b3-create");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Create Org"));

        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());
        Map<String, Object> body = authorizedGet("/api/v1/opportunities/" + opportunityId, token).getBody();

        Map<?, ?> compensation = (Map<?, ?>) body.get("compensation");
        assertThat(compensation.get("type")).isEqualTo("RANGE");
        assertThat(compensation.get("currencyCode")).isEqualTo("USD");
        assertThat(compensation.get("period")).isEqualTo("MONTH");
        assertThat(new java.math.BigDecimal(compensation.get("minimumAmount").toString()))
                .isEqualByComparingTo("200.00");
        assertThat(new java.math.BigDecimal(compensation.get("maximumAmount").toString()))
                .isEqualByComparingTo("500.00");
        assertThat((List<String>) body.get("skills")).containsExactly("Java", "SQL", "Communication");
        assertThat((List<String>) body.get("perks")).containsExactly("Mentorship", "Transport allowance");
        assertThat(((Number) body.get("hoursPerWeek")).intValue()).isEqualTo(20);
    }

    @Test
    void skillsAreTrimmedDeduplicatedAndOrderPreserved() {
        String token = registerAndLogin("b3-normalize");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Normalize Org"));

        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC",
                Map.of("skills", List.of("  React  ", "react", "", "Data   Analysis")));

        assertThat((List<String>) authorizedGet("/api/v1/opportunities/" + opportunityId, token).getBody().get("skills"))
                .containsExactly("React", "Data Analysis");
    }

    // ---------------------------------------------------------------- update compatibility

    /**
     * THE compatibility test, and the reason B3 uses presence-aware fields from the start.
     *
     * <p>An opportunity has every B3 field populated; a client written before B3 then saves it using
     * the only request shape it knows — the eleven fields this endpoint has always had. All four B3
     * fields must survive untouched. This is exactly the shape of the Backend Phase B2 data-loss
     * bug, and the existing frontend {@code updateOpportunity} sends precisely this body.
     */
    @Test
    void aPreB3ClientSavingTheOldRequestShapeCannotEraseTheNewFields() {
        String token = registerAndLogin("b3-compat");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Compat Org"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());

        // Exactly the pre-B3 body: no compensation, no skills, no perks, no hoursPerWeek.
        Map<String, Object> preB3Request = draftOpportunityBody("PUBLIC", Map.of());
        preB3Request.put("title", "Retitled By An Old Client");

        assertThat(authorizedPatch("/api/v1/opportunities/" + opportunityId, token, preB3Request).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        Map<String, Object> stored = authorizedGet("/api/v1/opportunities/" + opportunityId, token).getBody();

        assertThat(((Map<?, ?>) stored.get("compensation")).get("type")).isEqualTo("RANGE");
        assertThat((List<String>) stored.get("skills")).containsExactly("Java", "SQL", "Communication");
        assertThat((List<String>) stored.get("perks")).containsExactly("Mentorship", "Transport allowance");
        assertThat(((Number) stored.get("hoursPerWeek")).intValue()).isEqualTo(20);
        // The pre-B3 field it DID send was replaced, as that client expects.
        assertThat(stored.get("title")).isEqualTo("Retitled By An Old Client");
    }

    /** The pre-B3 fields keep FULL REPLACEMENT: omitting an optional one still clears it. */
    @Test
    void omittingALegacyOptionalFieldStillClearsItWhileNewFieldsSurvive() {
        String token = registerAndLogin("b3-legacy-semantics");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Legacy Semantics"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());

        Map<String, Object> withoutOptionals = draftOpportunityBody("PUBLIC", Map.of());
        withoutOptionals.remove("responsibilities");
        withoutOptionals.remove("requirements");
        withoutOptionals.remove("location");

        authorizedPatch("/api/v1/opportunities/" + opportunityId, token, withoutOptionals);

        Map<String, Object> stored = authorizedGet("/api/v1/opportunities/" + opportunityId, token).getBody();
        assertThat(stored).doesNotContainKeys("responsibilities", "requirements", "location");
        assertThat((List<String>) stored.get("skills")).isNotEmpty();
        assertThat(stored).containsKey("compensation");
    }

    @Test
    void sendingANewFieldReplacesIt() {
        String token = registerAndLogin("b3-explicit-set");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Explicit Set"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());

        Map<String, Object> change = draftOpportunityBody("PUBLIC", Map.of(
                "skills", List.of("Kotlin"),
                "hoursPerWeek", 35));

        Map<String, Object> updated =
                authorizedPatch("/api/v1/opportunities/" + opportunityId, token, change).getBody();

        assertThat((List<String>) updated.get("skills")).containsExactly("Kotlin");
        assertThat(((Number) updated.get("hoursPerWeek")).intValue()).isEqualTo(35);
        // Untouched siblings survive the same save.
        assertThat((List<String>) updated.get("perks")).containsExactly("Mentorship", "Transport allowance");
        assertThat(((Map<?, ?>) updated.get("compensation")).get("type")).isEqualTo("RANGE");
    }

    /**
     * Clearing must stay possible or a draft could never drop a stale perk. An empty array clears a
     * list and an explicit null clears compensation — both distinguishable from omission.
     */
    @Test
    void explicitEmptyAndNullClearTheNewFields() {
        String token = registerAndLogin("b3-explicit-clear");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Explicit Clear"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());

        // Hand-written JSON: a Map's null values would be stripped by non_null before they left here.
        String clearing = """
                {"title":"Cleared","description":"Body","mode":"PUBLIC","numberOfOpenings":3,
                 "workMode":"HYBRID","startDate":"%s","endDate":"%s","applicationDeadline":"%s",
                 "compensation":null,"skills":[],"perks":[],"hoursPerWeek":null}"""
                .formatted(java.time.LocalDate.now().plusMonths(2), java.time.LocalDate.now().plusMonths(5),
                        java.time.LocalDate.now().plusMonths(1));

        assertThat(authorizedPatchJson("/api/v1/opportunities/" + opportunityId, token, clearing).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        Map<String, Object> stored = authorizedGet("/api/v1/opportunities/" + opportunityId, token).getBody();
        assertThat(stored).doesNotContainKeys("compensation", "hoursPerWeek");
        assertThat((List<String>) stored.get("skills")).isEmpty();
        assertThat((List<String>) stored.get("perks")).isEmpty();
    }

    // ---------------------------------------------------------------- validation

    @Test
    void invalidCompensationCombinationsAreRejected() {
        String token = registerAndLogin("b3-comp-invalid");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Comp Invalid"));

        List<Map<String, Object>> invalid = List.of(
                // UNPAID carrying an amount.
                compensation("UNPAID", "USD", 200, null, "MONTH"),
                // RANGE with min > max.
                compensation("RANGE", "USD", 500, 200, "MONTH"),
                // RANGE missing a bound.
                compensation("RANGE", "USD", 200, null, "MONTH"),
                // FIXED with no amount.
                compensation("FIXED", "USD", null, null, "MONTH"),
                // FIXED smuggling a range.
                compensation("FIXED", "USD", 200, 500, "MONTH"),
                // Negative amount.
                compensation("FIXED", "USD", -5, null, "MONTH"),
                // Unknown currency.
                compensation("FIXED", "XYZ", 200, null, "MONTH"),
                // Amount without a currency.
                compensation("FIXED", null, 200, null, "MONTH"));

        for (Map<String, Object> compensation : invalid) {
            ResponseEntity<Map> response = authorizedPost(
                    "/api/v1/organizations/" + organizationId + "/opportunities", token,
                    draftOpportunityBody("PUBLIC", Map.of("compensation", compensation)));

            assertThat(response.getStatusCode()).as("%s must be rejected", compensation)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
        }
    }

    @Test
    void everyValidCompensationShapeIsAccepted() {
        String token = registerAndLogin("b3-comp-valid");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Comp Valid"));

        List<Map<String, Object>> valid = List.of(
                compensation("UNPAID", null, null, null, null),
                compensation("FIXED", "SOS", 15000, null, "MONTH"),
                compensation("RANGE", "USD", 200, 500, "MONTH"),
                compensation("NEGOTIABLE", null, null, null, null),
                compensation("NEGOTIABLE", "KES", 100, null, "WEEK"));

        for (Map<String, Object> compensation : valid) {
            ResponseEntity<Map> response = authorizedPost(
                    "/api/v1/organizations/" + organizationId + "/opportunities", token,
                    draftOpportunityBody("PUBLIC", Map.of("compensation", compensation)));

            assertThat(response.getStatusCode()).as("%s must be accepted", compensation)
                    .isEqualTo(HttpStatus.CREATED);
        }
    }

    @Test
    void hoursPerWeekIsBounded() {
        String token = registerAndLogin("b3-hours");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Hours Org"));

        for (int invalid : List.of(0, -5, 200)) {
            ResponseEntity<Map> response = authorizedPost(
                    "/api/v1/organizations/" + organizationId + "/opportunities", token,
                    draftOpportunityBody("PUBLIC", Map.of("hoursPerWeek", invalid)));

            assertThat(response.getStatusCode()).as("hoursPerWeek %s must be rejected", invalid)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void oversizedSkillListsAndValuesAreRejected() {
        String token = registerAndLogin("b3-caps");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Caps Org"));

        List<String> tooMany = new java.util.ArrayList<>();
        for (int index = 0; index <= 20; index++) {
            tooMany.add("Skill " + index);
        }

        assertThat(authorizedPost("/api/v1/organizations/" + organizationId + "/opportunities", token,
                draftOpportunityBody("PUBLIC", Map.of("skills", tooMany))).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(authorizedPost("/api/v1/organizations/" + organizationId + "/opportunities", token,
                draftOpportunityBody("PUBLIC", Map.of("skills", List.of("x".repeat(61))))).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ---------------------------------------------------------------- lifecycle unchanged

    /**
     * B3 does not relax the DRAFT-only editing rule. Enrichment is opportunity content, so a
     * published opportunity must not have its pay quietly rewritten under applicants who read it.
     */
    @Test
    void enrichmentCannotBeEditedAfterPublication() {
        String token = registerAndLogin("b3-published");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Published Org"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", token, Map.of());

        ResponseEntity<Map> response = authorizedPatch("/api/v1/opportunities/" + opportunityId, token,
                draftOpportunityBody("PUBLIC", Map.of("skills", List.of("Kotlin"))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_NOT_EDITABLE");
    }

    // ---------------------------------------------------------------- authorization unchanged

    @Test
    void supervisorAndOtherTenantsCannotSetEnrichment() {
        String token = registerAndLogin("b3-rbac");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 RBAC Org"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());

        String supervisorEmail = uniqueEmail("b3-sup");
        register(supervisorEmail, "Password123");
        String supervisorToken = loginAndExtractAccessToken(supervisorEmail, "Password123");
        insertOrganizationMembership(organizationId, userIdOf(supervisorEmail), "ORGANIZATION_SUPERVISOR");

        assertThat(authorizedPatch("/api/v1/opportunities/" + opportunityId, supervisorToken,
                draftOpportunityBody("PUBLIC", Map.of("skills", List.of("Hijacked")))).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        String otherToken = registerAndLogin("b3-other-tenant");
        createVerifiedOrganization(otherToken, uniqueName("B3 Other Org"));
        assertThat(authorizedPatch("/api/v1/opportunities/" + opportunityId, otherToken,
                draftOpportunityBody("PUBLIC", Map.of("skills", List.of("Hijacked")))).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        assertThat((List<String>) authorizedGet("/api/v1/opportunities/" + opportunityId, token).getBody().get("skills"))
                .containsExactly("Java", "SQL", "Communication");
    }

    // ---------------------------------------------------------------- public read surface

    @Test
    void publicDetailAndListingExposeTheNewFieldsAndNothingInternal() {
        String token = registerAndLogin("b3-public");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 Public Org"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", token, Map.of());

        Map<String, Object> detail =
                unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId).getBody();

        assertThat(((Map<?, ?>) detail.get("compensation")).get("type")).isEqualTo("RANGE");
        assertThat((List<String>) detail.get("skills")).containsExactly("Java", "SQL", "Communication");
        assertThat((List<String>) detail.get("perks")).containsExactly("Mentorship", "Transport allowance");
        assertThat(((Number) detail.get("hoursPerWeek")).intValue()).isEqualTo(20);
        // Internal fields stay internal — B3 widened the public DTO, it did not open it up.
        assertThat(detail).doesNotContainKeys("status", "createdBy", "createdAt", "updatedAt", "organizationId");

        List<Map<String, Object>> rows =
                rows(unauthenticatedGet("/api/v1/public/opportunities?organization=" + organizationId));
        assertThat(rows).hasSize(1);
        assertThat((List<String>) rows.get(0).get("skills")).containsExactly("Java", "SQL", "Communication");
        assertThat(rows.get(0)).doesNotContainKeys("status", "createdBy");
    }

    /**
     * The B1.5 invariant is untouched: a suspended organization's opportunity disappears from public
     * discovery, and B3's new query paths do not give it a way back.
     */
    @Test
    void suspendingTheOrganizationStillHidesTheEnrichedOpportunity() {
        String token = registerAndLogin("b3-b15");
        UUID organizationId = createVerifiedOrganization(token, uniqueName("B3 B15 Org"));
        UUID opportunityId = createDraftOpportunity(token, organizationId, "PUBLIC", fullEnrichment());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", token, Map.of());

        assertThat(unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        jdbcTemplate.update("UPDATE organizations SET verification_status = 'SUSPENDED' WHERE id = ?", organizationId);

        assertThat(unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(rows(unauthenticatedGet("/api/v1/public/opportunities?organization=" + organizationId))).isEmpty();
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> fullEnrichment() {
        Map<String, Object> overrides = new LinkedHashMap<>();
        overrides.put("compensation", compensation("RANGE", "USD", 200, 500, "MONTH"));
        overrides.put("skills", List.of("Java", "SQL", "Communication"));
        overrides.put("perks", List.of("Mentorship", "Transport allowance"));
        overrides.put("hoursPerWeek", 20);
        return overrides;
    }

    private Map<String, Object> compensation(
            String type, String currency, Integer minimum, Integer maximum, String period) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", type);
        if (currency != null) {
            body.put("currencyCode", currency);
        }
        if (minimum != null) {
            body.put("minimumAmount", minimum);
        }
        if (maximum != null) {
            body.put("maximumAmount", maximum);
        }
        if (period != null) {
            body.put("period", period);
        }
        return body;
    }
}
