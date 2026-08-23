package com.fursadhub.candidacy.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Centralized "may this opportunity receive candidates right now?" rules (CLAUDE.md Phase 4
 * section 3/4), so the self-application and nomination paths cannot drift apart.
 *
 * <p>{@link Clock} is injected rather than calling {@code LocalDate.now()} directly so deadline
 * behaviour is deterministically testable.
 */
@Component
public class OpportunityApplicationRules {

    private final Clock clock;

    public OpportunityApplicationRules(Clock clock) {
        this.clock = clock;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    /** Rules for a student applying to an opportunity directly. */
    public void requireOpenForSelfApplication(InternshipOpportunity opportunity) {
        requirePublished(opportunity);

        // A UNIVERSITY_TARGETED opportunity sources candidates exclusively through nominations —
        // self-application must fail with a distinct, machine-readable code (Phase 4 section 3).
        if (opportunity.getMode() != OpportunityMode.PUBLIC && opportunity.getMode() != OpportunityMode.HYBRID) {
            throw new ApiException("OPPORTUNITY_NOT_PUBLIC", HttpStatus.CONFLICT,
                    "This opportunity only accepts university nominations.");
        }
        if (opportunity.getApplicationDeadline() != null && today().isAfter(opportunity.getApplicationDeadline())) {
            throw new ApiException("OPPORTUNITY_DEADLINE_PASSED", HttpStatus.CONFLICT,
                    "The application deadline for this opportunity has passed.");
        }
    }

    /** Rules for a university nominating a student. */
    public void requireOpenForNomination(InternshipOpportunity opportunity) {
        requirePublished(opportunity);

        if (opportunity.getMode() != OpportunityMode.UNIVERSITY_TARGETED && opportunity.getMode() != OpportunityMode.HYBRID) {
            throw new ApiException("OPPORTUNITY_NOT_TARGETED_TO_UNIVERSITY", HttpStatus.CONFLICT,
                    "This opportunity does not accept university nominations.");
        }
    }

    /**
     * PAUSED, CLOSED, CANCELLED and DRAFT opportunities all reject new candidates. A DRAFT is
     * reported as "not published" rather than "not found" only because the caller already proved
     * they could see it through a path that does not leak drafts.
     */
    private void requirePublished(InternshipOpportunity opportunity) {
        if (opportunity.getStatus() != OpportunityStatus.PUBLISHED) {
            throw new ApiException("OPPORTUNITY_NOT_PUBLISHED", HttpStatus.CONFLICT,
                    "This opportunity is not currently accepting candidates.");
        }
    }
}
