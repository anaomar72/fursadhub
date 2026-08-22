package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.opportunity.domain.PublicOpportunityFilter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Public internship discovery (CLAUDE.md section 12). Only {@code PUBLISHED} opportunities in
 * mode {@code PUBLIC}/{@code HYBRID} are ever returned — enforced inside the repository query
 * itself (not just filtered here) so a university-targeted-only or draft opportunity can never
 * leak through this path, and existence of any other opportunity is never revealed by id lookup.
 */
@Service
@Transactional(readOnly = true)
public class PublicOpportunityQueryService {

    private final InternshipOpportunityRepository opportunities;

    public PublicOpportunityQueryService(InternshipOpportunityRepository opportunities) {
        this.opportunities = opportunities;
    }

    public Page<InternshipOpportunity> search(PublicOpportunityFilter filter, Pageable pageable) {
        return opportunities.searchPublic(filter, pageable);
    }

    public InternshipOpportunity getPublicOrThrow(UUID opportunityId) {
        return opportunities.findPublicById(opportunityId)
                .orElseThrow(() -> new ApiException("OPPORTUNITY_NOT_FOUND", HttpStatus.NOT_FOUND, "Opportunity not found."));
    }
}
