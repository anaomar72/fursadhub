package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.CandidacyEventRepository;
import com.fursadhub.candidacy.domain.CandidacyEventType;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import com.fursadhub.candidacy.domain.CandidacyStatus;
import com.fursadhub.candidacy.domain.InternshipOffer;
import com.fursadhub.candidacy.domain.InternshipOfferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Lazily expires internship offers whose response deadline has passed (Phase 4 section 21).
 *
 * <p>FursadHub deliberately has no scheduler for this: whichever request first observes a lapsed
 * offer transitions it, which is enough for the pilot and adds no infrastructure (CLAUDE.md
 * section 3).
 *
 * <p><strong>Why {@code REQUIRES_NEW}.</strong> The caller that notices the lapse is usually about
 * to reject the request — {@code accept()} expires the offer and then throws {@code
 * OFFER_NOT_PENDING}. If the expiry ran in the caller's transaction, that throw would roll the
 * expiry back and the offer would sit at PENDING forever, expiring "again" on every subsequent
 * call. Running in its own committed transaction makes the state change stick regardless of what
 * the caller does next — the same reasoning as {@code AuditService}.
 *
 * <p>Callers must invoke this BEFORE taking their own {@code FOR UPDATE} lock on the offer row:
 * this method locks that row itself, so calling it while already holding the lock would deadlock
 * against the suspended outer transaction.
 */
@Service
public class OfferExpiryService {

    private final InternshipOfferRepository offers;
    private final CandidacyRepository candidacies;
    private final CandidacyEventRepository events;
    private final OpportunityApplicationRules applicationRules;

    public OfferExpiryService(
            InternshipOfferRepository offers, CandidacyRepository candidacies, CandidacyEventRepository events,
            OpportunityApplicationRules applicationRules) {
        this.offers = offers;
        this.candidacies = candidacies;
        this.events = events;
        this.applicationRules = applicationRules;
    }

    /** No-op unless the offer is still PENDING and its deadline has genuinely passed. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireIfLapsed(UUID offerId) {
        InternshipOffer offer = offers.findByIdForUpdate(offerId).orElse(null);
        if (offer == null || !offer.isPending() || !offer.isPastDeadline(applicationRules.today())) {
            return;
        }

        offer.expire();
        offers.save(offer);

        Candidacy candidacy = candidacies.findById(offer.getCandidacyId()).orElse(null);
        if (candidacy == null || candidacy.getStatus() != CandidacyStatus.OFFERED) {
            return;
        }

        CandidacyStatus from = candidacy.getStatus();
        candidacy.markOfferExpired();
        candidacies.save(candidacy);

        // Null actor: no human triggered this, the deadline simply passed.
        events.save(CandidacyEvent.record(
                candidacy.getId(), CandidacyEventType.OFFER_EXPIRED, null, from, candidacy.getStatus(),
                "offerId=" + offer.getId()));
    }
}
