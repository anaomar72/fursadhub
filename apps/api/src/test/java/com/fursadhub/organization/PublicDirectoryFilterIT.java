package com.fursadhub.organization;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B2 — the directory filters that B1 deliberately omitted, now that real columns back
 * them: industry, city and country for organizations; city and country for universities.
 *
 * <p>Every test also re-asserts what must NOT have changed: the {@code VERIFIED}-only rule from
 * B1/B1.5, the sort allowlist, the page-size cap and the pagination envelope.
 */
class PublicDirectoryFilterIT extends AbstractPhase3IT {

    private static final String ORGANIZATIONS = "/api/v1/public/organizations";
    private static final String UNIVERSITIES = "/api/v1/public/universities";

    // ---------------------------------------------------------------- organization filters

    @Test
    void industryFilterSelectsOnlyMatchingOrganizations() {
        String adminToken = registerAndLogin("b2f-industry");
        String shared = uniqueName("B2F Industry Group");
        UUID telecom = verifiedOrganizationWith(adminToken, shared + " Telecom", "Telecommunications", "Mogadishu", "SO");
        verifiedOrganizationWith(adminToken, shared + " Bank", "Banking", "Mogadishu", "SO");

        assertThat(ids(query(ORGANIZATIONS, shared, "industry=Telecommunications")))
                .containsExactly(telecom.toString());
    }

    /** Case-insensitive, so a filter value matches however the organization capitalised it. */
    @Test
    void industryFilterIsCaseInsensitive() {
        String adminToken = registerAndLogin("b2f-ind-case");
        String shared = uniqueName("B2F Industry Case");
        UUID id = verifiedOrganizationWith(adminToken, shared + " Co", "Telecommunications", "Hargeisa", "SO");

        assertThat(ids(query(ORGANIZATIONS, shared, "industry=tELECOMMUNICATIONS")))
                .containsExactly(id.toString());
    }

    /** Exact match, not substring: "Ban" must not select "Banking". */
    @Test
    void industryFilterIsAnExactMatchNotASubstring() {
        String adminToken = registerAndLogin("b2f-ind-exact");
        String shared = uniqueName("B2F Industry Exact");
        verifiedOrganizationWith(adminToken, shared + " Bank", "Banking", "Mogadishu", "SO");

        assertThat(ids(query(ORGANIZATIONS, shared, "industry=Ban"))).isEmpty();
    }

    @Test
    void cityAndCountryFiltersSelectOnlyMatchingOrganizations() {
        String adminToken = registerAndLogin("b2f-loc");
        String shared = uniqueName("B2F Location Group");
        UUID mogadishu = verifiedOrganizationWith(adminToken, shared + " Mog", "Technology", "Mogadishu", "SO");
        UUID nairobi = verifiedOrganizationWith(adminToken, shared + " Nai", "Technology", "Nairobi", "KE");

        assertThat(ids(query(ORGANIZATIONS, shared, "city=Mogadishu"))).containsExactly(mogadishu.toString());
        assertThat(ids(query(ORGANIZATIONS, shared, "country=KE"))).containsExactly(nairobi.toString());
        // Stored upper-cased, so a lower-case filter still matches.
        assertThat(ids(query(ORGANIZATIONS, shared, "country=ke"))).containsExactly(nairobi.toString());
    }

    @Test
    void filtersCombineAsAConjunction() {
        String adminToken = registerAndLogin("b2f-combo");
        String shared = uniqueName("B2F Combo Group");
        UUID match = verifiedOrganizationWith(adminToken, shared + " Match", "Technology", "Mogadishu", "SO");
        verifiedOrganizationWith(adminToken, shared + " WrongCity", "Technology", "Hargeisa", "SO");
        verifiedOrganizationWith(adminToken, shared + " WrongIndustry", "Banking", "Mogadishu", "SO");

        assertThat(ids(query(ORGANIZATIONS, shared, "industry=Technology&city=Mogadishu&country=SO")))
                .containsExactly(match.toString());
    }

    @Test
    void anOrganizationWithNoIndustryIsSimplyNotMatchedByAnIndustryFilter() {
        String adminToken = registerAndLogin("b2f-null");
        String shared = uniqueName("B2F Null Group");
        createVerifiedOrganization(adminToken, shared + " Bare");

        assertThat(ids(query(ORGANIZATIONS, shared, "industry=Technology"))).isEmpty();
        // ...but it is still in the unfiltered directory.
        assertThat(ids(query(ORGANIZATIONS, shared, ""))).hasSize(1);
    }

    // ---------------------------------------------------------------- invariants preserved

    /** B1.5's live verification rule is untouched by the new filters. */
    @Test
    void filtersNeverSurfaceANonVerifiedOrganization() {
        String adminToken = registerAndLogin("b2f-verified");
        String shared = uniqueName("B2F Verified Group");
        UUID id = verifiedOrganizationWith(adminToken, shared + " Co", "Technology", "Mogadishu", "SO");
        assertThat(ids(query(ORGANIZATIONS, shared, "industry=Technology"))).containsExactly(id.toString());

        jdbcTemplate.update("UPDATE organizations SET verification_status = 'SUSPENDED' WHERE id = ?", id);

        assertThat(ids(query(ORGANIZATIONS, shared, "industry=Technology"))).isEmpty();
        assertThat(ids(query(ORGANIZATIONS, shared, "city=Mogadishu"))).isEmpty();
        assertThat(ids(query(ORGANIZATIONS, shared, ""))).isEmpty();
    }

    @Test
    void paginationTotalsAndSortAllowlistStillBehaveAsInB1() {
        String adminToken = registerAndLogin("b2f-paging");
        String shared = uniqueName("B2F Paging Group");
        verifiedOrganizationWith(adminToken, shared + " Charlie", "Technology", "Mogadishu", "SO");
        verifiedOrganizationWith(adminToken, shared + " Alpha", "Technology", "Mogadishu", "SO");
        verifiedOrganizationWith(adminToken, shared + " Bravo", "Technology", "Mogadishu", "SO");

        ResponseEntity<Map> filtered = query(ORGANIZATIONS, shared, "industry=Technology&size=2&page=0");
        assertThat((Number) filtered.getBody().get("totalElements")).isEqualTo(3);
        assertThat((Number) filtered.getBody().get("totalPages")).isEqualTo(2);
        assertThat(names(filtered)).containsExactly(shared + " Alpha", shared + " Bravo");

        assertThat(names(query(ORGANIZATIONS, shared, "industry=Technology&sort=nameDesc")))
                .containsExactly(shared + " Charlie", shared + " Bravo", shared + " Alpha");

        ResponseEntity<Map> rejected = query(ORGANIZATIONS, shared, "sort=registrationNumber");
        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(rejected.getBody().get("code")).isEqualTo("VALIDATION_FAILED");

        assertThat((Number) query(ORGANIZATIONS, shared, "size=5000").getBody().get("size")).isEqualTo(50);
    }

    // ---------------------------------------------------------------- university filters

    @Test
    void universityCityAndCountryFiltersSelectOnlyMatchingUniversities() {
        String shared = uniqueName("B2F Uni Group");
        UUID mogadishu = verifiedUniversityWith(shared + " Mog", "Mogadishu", "SO");
        UUID nairobi = verifiedUniversityWith(shared + " Nai", "Nairobi", "KE");

        assertThat(ids(query(UNIVERSITIES, shared, "city=Mogadishu"))).containsExactly(mogadishu.toString());
        assertThat(ids(query(UNIVERSITIES, shared, "country=KE"))).containsExactly(nairobi.toString());
        assertThat(ids(query(UNIVERSITIES, shared, "city=mogadishu"))).containsExactly(mogadishu.toString());
    }

    @Test
    void universityFiltersNeverSurfaceANonVerifiedUniversity() {
        String shared = uniqueName("B2F Uni Verified");
        UUID id = verifiedUniversityWith(shared + " Uni", "Mogadishu", "SO");
        assertThat(ids(query(UNIVERSITIES, shared, "city=Mogadishu"))).containsExactly(id.toString());

        jdbcTemplate.update("UPDATE universities SET status = 'SUSPENDED' WHERE id = ?", id);

        assertThat(ids(query(UNIVERSITIES, shared, "city=Mogadishu"))).isEmpty();
        assertThat(ids(query(UNIVERSITIES, shared, ""))).isEmpty();
    }

    @Test
    void universityPaginationAndSortStillBehaveAsInB1() {
        String shared = uniqueName("B2F Uni Paging");
        verifiedUniversityWith(shared + " Charlie", "Mogadishu", "SO");
        verifiedUniversityWith(shared + " Alpha", "Mogadishu", "SO");

        ResponseEntity<Map> page = query(UNIVERSITIES, shared, "city=Mogadishu&size=1&page=0");
        assertThat((Number) page.getBody().get("totalElements")).isEqualTo(2);
        assertThat(names(page)).containsExactly(shared + " Alpha");

        assertThat(query(UNIVERSITIES, shared, "sort=status").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ---------------------------------------------------------------- helpers

    private ResponseEntity<Map> query(String base, String nameFragment, String extra) {
        String url = base + "?query=" + encode(nameFragment) + (extra.isEmpty() ? "" : "&" + extra);
        return unauthenticatedGet(url);
    }

    private UUID verifiedOrganizationWith(String adminToken, String name, String industry, String city, String country) {
        UUID organizationId = createVerifiedOrganization(adminToken, name);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("industry", industry);
        body.put("city", city);
        body.put("countryCode", country);
        ResponseEntity<Map> response = authorizedPatch("/api/v1/organizations/" + organizationId, adminToken, body);
        if (response.getStatusCode() != HttpStatus.OK) {
            throw new IllegalStateException("Profile update failed: " + response.getBody());
        }
        return organizationId;
    }

    private UUID verifiedUniversityWith(String name, String city, String country) {
        UUID universityId = insertVerifiedUniversity(name);
        jdbcTemplate.update(
                "UPDATE universities SET city = ?, country_code = ? WHERE id = ?", city, country, universityId);
        return universityId;
    }
}
