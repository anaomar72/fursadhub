package com.fursadhub.opportunity.api;

import com.fursadhub.common.api.PageResponse;
import com.fursadhub.opportunity.application.PublicOpportunityQueryService;
import com.fursadhub.opportunity.application.ScreeningQuestionService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.PublicOpportunityFilter;
import com.fursadhub.opportunity.domain.WorkMode;
import com.fursadhub.organization.api.OrganizationSummaryResponse;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.domain.Organization;
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

import java.util.List;
import java.util.Map;
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
    private final ScreeningQuestionService screeningQuestionService;

    public PublicOpportunityController(
            PublicOpportunityQueryService queryService, OrganizationQueryService organizationQueryService,
            ScreeningQuestionService screeningQuestionService) {
        this.queryService = queryService;
        this.organizationQueryService = organizationQueryService;
        this.screeningQuestionService = screeningQuestionService;
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

        // ONE query for every organization on the page, instead of one per row (Backend Phase B1).
        // Page.map preserves the page's own ordering, size and totals exactly — the response
        // contract and the result order are unchanged.
        Map<UUID, Organization> organizations = organizationQueryService.getAllByIds(
                page.getContent().stream().map(InternshipOpportunity::getOrganizationId).distinct().toList());

        return PageResponse.from(page, opportunity -> toResponse(
                opportunity, organizationQueryService.requireFrom(organizations, opportunity.getOrganizationId())));
    }

    @GetMapping("/{opportunityId}")
    public PublicOpportunityResponse get(@PathVariable UUID opportunityId) {
        InternshipOpportunity opportunity = queryService.getPublicOrThrow(opportunityId);
        // A single opportunity needs a single organization; the batch path would be one query either
        // way, so this keeps reading as the simple lookup it is.
        return toResponse(opportunity, organizationQueryService.getOrThrow(opportunity.getOrganizationId()));
    }

    /**
     * The screening questions an applicant must answer. Routed through
     * {@code getPublicOrThrow} first so questions are only ever exposed for an opportunity that is
     * itself publicly visible — a targeted-only or draft opportunity's questions stay private.
     */
    @GetMapping("/{opportunityId}/screening-questions")
    public List<ScreeningQuestionResponse> screeningQuestions(@PathVariable UUID opportunityId) {
        InternshipOpportunity opportunity = queryService.getPublicOrThrow(opportunityId);
        return screeningQuestionService.listPublic(opportunity.getId()).stream()
                .map(ScreeningQuestionResponse::from)
                .toList();
    }

    private Pageable capPageSize(Pageable pageable) {
        int size = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
        Sort sort = pageable.getSortOr(Sort.by(Sort.Direction.DESC, "publishedAt"));
        return PageRequest.of(pageable.getPageNumber(), size, sort);
    }

    private PublicOpportunityResponse toResponse(InternshipOpportunity opportunity, Organization organization) {
        return PublicOpportunityResponse.from(opportunity, OrganizationSummaryResponse.from(organization));
    }
}
