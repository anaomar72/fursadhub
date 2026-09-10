package com.fursadhub.student.api;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.api.PageResponse;
import com.fursadhub.opportunity.api.PublicOpportunityResponse;
import com.fursadhub.opportunity.application.OpportunityTagService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.organization.api.OrganizationSummaryResponse;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.student.application.SavedOpportunityService;
import com.fursadhub.student.domain.SavedOpportunityRepository.SavedOpportunityView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * A student's private saved internships (Backend Phase B4).
 *
 * <p>Every route is scoped to the authenticated student by {@code currentUserId(jwt)} — the id is
 * never accepted from the request (CLAUDE.md section 12), so there is no shape of call that reaches
 * another student's bookmarks.
 */
@RestController
@RequestMapping("/api/v1/students/me/saved-opportunities")
public class SavedOpportunityController {

    private static final int MAX_PAGE_SIZE = 50;

    /** Enough for two pages of cards; bounded so one request cannot ask about unlimited ids. */
    private static final int MAX_STATUS_IDS = 50;

    private final SavedOpportunityService savedOpportunities;
    private final OrganizationQueryService organizationQueryService;
    private final OpportunityTagService tags;

    public SavedOpportunityController(
            SavedOpportunityService savedOpportunities, OrganizationQueryService organizationQueryService,
            OpportunityTagService tags) {
        this.savedOpportunities = savedOpportunities;
        this.organizationQueryService = organizationQueryService;
        this.tags = tags;
    }

    /** Idempotent: saving something already saved succeeds without creating a second bookmark. */
    @PostMapping("/{opportunityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId) {
        savedOpportunities.save(currentUserId(jwt), opportunityId);
    }

    /** Idempotent: unsaving something not saved is a successful no-op, not a 404. */
    @DeleteMapping("/{opportunityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsave(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId) {
        savedOpportunities.unsave(currentUserId(jwt), opportunityId);
    }

    /**
     * The student's saved internships, newest save first, limited to opportunities that are
     * currently publicly discoverable.
     *
     * <p>Organizations, skills and perks are batch-loaded for the whole page — one query each —
     * exactly as the public listing does. A 20-row page must not become 60 queries.
     */
    @GetMapping
    public PageResponse<SavedOpportunityResponse> list(
            @AuthenticationPrincipal Jwt jwt, @PageableDefault(size = 20) Pageable pageable) {
        Page<SavedOpportunityView> page = savedOpportunities.list(currentUserId(jwt), capPageSize(pageable));

        List<InternshipOpportunity> opportunities = page.getContent().stream()
                .map(SavedOpportunityView::opportunity)
                .toList();
        Map<UUID, Organization> organizations = organizationQueryService.getAllByIds(
                opportunities.stream().map(InternshipOpportunity::getOrganizationId).distinct().toList());
        List<UUID> opportunityIds = opportunities.stream().map(InternshipOpportunity::getId).toList();
        Map<UUID, List<String>> skills = tags.skillsByOpportunity(opportunityIds);
        Map<UUID, List<String>> perks = tags.perksByOpportunity(opportunityIds);

        return PageResponse.from(page, saved -> new SavedOpportunityResponse(
                saved.savedAt(),
                PublicOpportunityResponse.from(
                        saved.opportunity(),
                        OrganizationSummaryResponse.from(organizationQueryService.requireFrom(
                                organizations, saved.opportunity().getOrganizationId())),
                        skills.getOrDefault(saved.opportunity().getId(), List.of()),
                        perks.getOrDefault(saved.opportunity().getId(), List.of()))));
    }

    /**
     * Which of the supplied opportunities the current student has saved, so a page of public cards
     * can render its bookmark controls without the public endpoints becoming personalized.
     *
     * <p>The cap applies to the RAW parameter list, before de-duplication. De-duplicating first
     * would make the bound trivially bypassable — 500 copies of one id would collapse to one and
     * sail through — and the cost this limit exists to bound is the request the server must parse,
     * not the set that survives it. Within the bound, duplicates are then collapsed so the query
     * stays a single lookup and the response carries each id once.
     */
    @GetMapping("/status")
    public SavedOpportunityStatusResponse status(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "opportunityId", required = false) List<UUID> opportunityIds) {
        List<UUID> raw = opportunityIds == null ? List.of() : opportunityIds;
        if (raw.size() > MAX_STATUS_IDS) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "At most " + MAX_STATUS_IDS + " opportunity ids may be checked at once.");
        }
        Set<UUID> requested = new LinkedHashSet<>(raw);

        return new SavedOpportunityStatusResponse(
                savedOpportunities.savedIdsAmong(currentUserId(jwt), requested).stream()
                        .map(UUID::toString)
                        .toList());
    }

    /**
     * Caps the page size and pins the ordering. Sorting is deliberately NOT caller-controllable: the
     * list is ordered by when the student saved each item, a column on the bookmark that no client
     * sort key could name, and the query owns that ordering along with its tie-break.
     */
    private Pageable capPageSize(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), MAX_PAGE_SIZE));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
