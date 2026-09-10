package com.fursadhub.administration.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.AdminOpportunityFilter;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Platform-wide opportunity oversight for Super Admins (Backend Phase B6).
 *
 * <p><strong>Read-only, and structurally so.</strong> There is no save, no state transition and no
 * repository write anywhere in this class. That is the phase's central constraint rather than an
 * omission: an administrator who could publish, pause or edit an organization's internship would be
 * a recruiter with extra reach, and the opportunity state machine (CLAUDE.md section 33) would have
 * two authorities instead of one. Organizations own their opportunities; the platform observes them.
 *
 * <p><strong>{@code requireSuperAdmin}, not {@code requireReviewer}.</strong> A verification officer
 * reviews institutions — their queue is the escalation and institution-verification surfaces, and
 * nothing about approving a university requires reading every draft internship on the platform. The
 * existing split (CLAUDE.md sections 23-24) is preserved rather than widened because this endpoint
 * happens to be new.
 *
 * <p>Both methods deliberately bypass {@code PublicOpportunityVisibility}. See
 * {@code InternshipOpportunitySpecifications.matchingForAdmin} for why administrative visibility and
 * public discoverability are different questions.
 */
@Service
@Transactional(readOnly = true)
public class AdminOpportunityQueryService {

    private final PlatformAuthorization authorization;
    private final InternshipOpportunityRepository opportunities;

    public AdminOpportunityQueryService(
            PlatformAuthorization authorization, InternshipOpportunityRepository opportunities) {
        this.authorization = authorization;
        this.opportunities = opportunities;
    }

    /** Every opportunity on the platform, in any state, narrowed by the allowlisted filter. */
    public Page<InternshipOpportunity> search(UUID actingUserId, AdminOpportunityFilter filter, Pageable pageable) {
        authorization.requireSuperAdmin(actingUserId);
        return opportunities.searchForAdmin(filter, pageable);
    }

    /**
     * One opportunity, whatever its state.
     *
     * <p>Uses the plain {@code findById} rather than {@code findPublicById}: a Super Admin
     * investigating a complaint about a draft or a cancelled listing must be able to open it, and a
     * 404 for an opportunity that plainly exists would make the console useless for the one job it
     * has. Nothing here reveals who applied — see {@code AdminOpportunityDetailResponse}.
     */
    public InternshipOpportunity get(UUID actingUserId, UUID opportunityId) {
        authorization.requireSuperAdmin(actingUserId);
        return opportunities.findById(opportunityId)
                .orElseThrow(() -> new ApiException(
                        "OPPORTUNITY_NOT_FOUND", HttpStatus.NOT_FOUND, "Opportunity not found."));
    }
}
