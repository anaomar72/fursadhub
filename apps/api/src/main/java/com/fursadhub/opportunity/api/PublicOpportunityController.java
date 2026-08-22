package com.fursadhub.opportunity.api;

import com.fursadhub.common.api.PageResponse;
import com.fursadhub.opportunity.application.PublicOpportunityQueryService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.PublicOpportunityFilter;
import com.fursadhub.opportunity.domain.WorkMode;
import com.fursadhub.organization.api.OrganizationSummaryResponse;
import com.fursadhub.organization.application.OrganizationQueryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Public internship discovery (CLAUDE.md section 12) — no authentication required. Only
 * {@code PUBLISHED} {@code PUBLIC}/{@code HYBRID} opportunities are ever visible; a
 * university-targeted-only or draft opportunity never appears here, by construction in the query
 * layer (not by filtering a broader result set).
 */
@RestController
@RequestMapping("/api/v1/public/opportunities")
public class PublicOpportunityController {

    private static final int MAX_PAGE_SIZE = 50;

    private final PublicOpportunityQueryService queryService;
    private final OrganizationQueryService organizationQueryService;

    public PublicOpportunityController(PublicOpportunityQueryService queryService, OrganizationQueryService organizationQueryService) {
        this.queryService = queryService;
        this.organizationQueryService = organizationQueryService;
    }

    @GetMapping
    public PageResponse<PublicOpportunityResponse> list(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) WorkMode workMode,
            @RequestParam(required = false) UUID organization,
            @PageableDefault(size = 20) Pageable pageable) {
        Pageable safePageable = capPageSize(pageable);
        PublicOpportunityFilter filter = new PublicOpportunityFilter(query, location, workMode, organization);
        Page<InternshipOpportunity> page = queryService.search(filter, safePageable);
        return PageResponse.from(page, this::toResponse);
    }

    @GetMapping("/{opportunityId}")
    public PublicOpportunityResponse get(@PathVariable UUID opportunityId) {
        return toResponse(queryService.getPublicOrThrow(opportunityId));
    }

    private Pageable capPageSize(Pageable pageable) {
        int size = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
        Sort sort = pageable.getSortOr(Sort.by(Sort.Direction.DESC, "publishedAt"));
        return PageRequest.of(pageable.getPageNumber(), size, sort);
    }

    private PublicOpportunityResponse toResponse(InternshipOpportunity opportunity) {
        OrganizationSummaryResponse organization =
                OrganizationSummaryResponse.from(organizationQueryService.getOrThrow(opportunity.getOrganizationId()));
        return PublicOpportunityResponse.from(opportunity, organization);
    }
}
