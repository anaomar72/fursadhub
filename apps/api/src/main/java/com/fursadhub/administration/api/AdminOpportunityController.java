package com.fursadhub.administration.api;

import com.fursadhub.administration.application.AdminOpportunityQueryService;
import com.fursadhub.common.api.PageResponse;
import com.fursadhub.opportunity.application.OpportunityTagService;
import com.fursadhub.opportunity.domain.AdminOpportunityFilter;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityStatus;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.domain.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Platform-wide opportunity oversight for Super Admins (Backend Phase B6).
 *
 * <p><strong>Read-only by construction: there is no POST, PATCH, PUT or DELETE in this file.</strong>
 * Adding one would give the platform a second authority over an organization's internships, and the
 * opportunity state machine (CLAUDE.md section 33) is owned by the organization that created it.
 * Super Admin can see everything here and change nothing.
 *
 * <p>Unlike {@code PublicOpportunityController}, this shows every state — DRAFT through CANCELLED —
 * and does not hide a published opportunity whose organization has been suspended. That last case is
 * precisely what someone opens this screen to investigate, so each row reports
 * {@code publiclyDiscoverable} explicitly rather than leaving the operator to infer it.
 */
@RestController
@RequestMapping("/api/v1/admin/opportunities")
public class AdminOpportunityController {

    /** The same cap the public listing uses, so one convention governs paging across the API. */
    private static final int MAX_PAGE_SIZE = 50;

    private final AdminOpportunityQueryService queryService;
    private final OrganizationQueryService organizations;
    private final OpportunityTagService tags;

    public AdminOpportunityController(
            AdminOpportunityQueryService queryService, OrganizationQueryService organizations,
            OpportunityTagService tags) {
        this.queryService = queryService;
        this.organizations = organizations;
        this.tags = tags;
    }

    /**
     * Every opportunity on the platform, filtered and paged.
     *
     * <p>Filtering happens entirely in SQL — never by paging everything and narrowing in Java — so
     * {@code totalElements} describes the filtered result rather than the table.
     *
     * <p>Spring binds {@code status} and {@code mode} to enums directly, which is the allowlist: an
     * unknown value never reaches the query and comes back as a 400 rather than being ignored, so a
     * misspelled filter cannot silently return the whole platform.
     */
    @GetMapping
    public PageResponse<AdminOpportunitySummaryResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) OpportunityStatus status,
            @RequestParam(required = false) OpportunityMode mode,
            @RequestParam(required = false) UUID organizationId,
            @PageableDefault(size = 20) Pageable pageable) {
        AdminOpportunityFilter filter = new AdminOpportunityFilter(query, status, mode, organizationId);
        Page<InternshipOpportunity> page = queryService.search(currentUserId(jwt), filter, fixedOrder(pageable));

        // ONE query for every organization on the page (the Backend Phase B1 batching pattern), not
        // one per row. A 20-row page issues one opportunity query and one organization query.
        Map<UUID, Organization> owners = organizations.getAllByIds(
                page.getContent().stream().map(InternshipOpportunity::getOrganizationId).distinct().toList());

        return PageResponse.from(page, opportunity -> AdminOpportunitySummaryResponse.from(
                opportunity, organizations.requireFrom(owners, opportunity.getOrganizationId())));
    }

    /**
     * One opportunity in full, in any state.
     *
     * <p>Skills and perks are loaded here rather than on the list, because they are per-record detail
     * — batching them across a table of twenty rows would fetch data no column displays.
     */
    @GetMapping("/{opportunityId}")
    public AdminOpportunityDetailResponse get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId) {
        InternshipOpportunity opportunity = queryService.get(currentUserId(jwt), opportunityId);
        return AdminOpportunityDetailResponse.from(
                opportunity,
                organizations.getOrThrow(opportunity.getOrganizationId()),
                tags.skillsOf(opportunityId),
                tags.perksOf(opportunityId));
    }

    /**
     * Caps the page size and PINS the ordering.
     *
     * <p>The caller's sort is deliberately discarded rather than validated against an allowlist: this
     * screen has one meaningful order — newest first — and accepting sort property names would expose
     * entity field names as API surface for no operational gain. {@code id} breaks ties so paging is
     * deterministic; without it two opportunities created in the same instant could swap places
     * between page 1 and page 2, and a row would be silently skipped.
     */
    private Pageable fixedOrder(Pageable pageable) {
        int size = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
        return PageRequest.of(
                pageable.getPageNumber(), size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
