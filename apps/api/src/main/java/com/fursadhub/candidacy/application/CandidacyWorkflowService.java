package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.CandidacyEventRepository;
import com.fursadhub.candidacy.domain.CandidacyEventType;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import com.fursadhub.candidacy.domain.CandidacyStatus;
import com.fursadhub.candidacy.domain.InternshipOfferRepository;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.placement.domain.PlacementRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.function.Consumer;

/**
 * The organization's recruitment-stage commands, plus the student's own withdrawal
 * (CLAUDE.md Phase 4 section 6/13).
 *
 * <p>These are explicit business commands, never a generic "set status to whatever the client
 * sent" (CLAUDE.md section 10). Which transitions are legal lives in {@link Candidacy} itself; this
 * service owns authorization, history and audit around them.
 */
@Service
public class CandidacyWorkflowService {

    private final CandidacyRepository candidacies;
    private final CandidacyEventRepository events;
    private final CandidacyAuthorization candidacyAuthorization;
    private final InternshipOfferRepository offers;
    private final PlacementRepository placements;
    private final AuditService audit;

    public CandidacyWorkflowService(
            CandidacyRepository candidacies, CandidacyEventRepository events,
            CandidacyAuthorization candidacyAuthorization, InternshipOfferRepository offers,
            PlacementRepository placements, AuditService audit) {
        this.candidacies = candidacies;
        this.events = events;
        this.candidacyAuthorization = candidacyAuthorization;
        this.offers = offers;
        this.placements = placements;
        this.audit = audit;
    }

    @Transactional
    public Candidacy review(UUID actingUserId, UUID candidacyId, String ipAddress, String userAgent) {
        return recruiterTransition(actingUserId, candidacyId, Candidacy::markUnderReview,
                CandidacyEventType.MOVED_UNDER_REVIEW, ipAddress, userAgent);
    }

    @Transactional
    public Candidacy shortlist(UUID actingUserId, UUID candidacyId, String ipAddress, String userAgent) {
        return recruiterTransition(actingUserId, candidacyId, Candidacy::shortlist,
                CandidacyEventType.SHORTLISTED, ipAddress, userAgent);
    }

    @Transactional
    public Candidacy moveToInterview(UUID actingUserId, UUID candidacyId, String ipAddress, String userAgent) {
        return recruiterTransition(actingUserId, candidacyId, Candidacy::moveToInterview,
                CandidacyEventType.MOVED_TO_INTERVIEW, ipAddress, userAgent);
    }

    @Transactional
    public Candidacy reject(UUID actingUserId, UUID candidacyId, String ipAddress, String userAgent) {
        Candidacy candidacy = candidacyAuthorization.requireRecruiterAccess(actingUserId, candidacyId);

        // Rejecting a candidate who has a live offer would strand that offer PENDING; the recruiter
        // must withdraw the offer first so both records stay consistent.
        if (offers.findLiveByCandidacyId(candidacyId).isPresent()) {
            throw new ApiException("OFFER_STILL_LIVE", HttpStatus.CONFLICT,
                    "Withdraw the outstanding offer before rejecting this candidate.");
        }

        return applyTransition(candidacy, Candidacy::reject, CandidacyEventType.CANDIDACY_REJECTED, actingUserId,
                "CANDIDACY_REJECTED", ipAddress, userAgent);
    }

    /**
     * Student-initiated withdrawal (Phase 4 section 13). Blocked once the candidacy is ACCEPTED —
     * {@link Candidacy}'s transition table has no outgoing edge from ACCEPTED, and the explicit
     * placement check below turns that into a clear, machine-readable refusal rather than a generic
     * invalid-transition error.
     */
    @Transactional
    public Candidacy withdraw(UUID studentUserId, UUID candidacyId, String ipAddress, String userAgent) {
        Candidacy candidacy = candidacyAuthorization.requireOwningStudent(studentUserId, candidacyId);

        if (placements.findByCandidacyId(candidacyId).isPresent()) {
            throw new ApiException("CANDIDACY_HAS_PLACEMENT", HttpStatus.CONFLICT,
                    "You cannot withdraw after accepting an offer and starting a placement.");
        }

        // A pending offer is implicitly refused by withdrawing, so it must not stay live.
        offers.findLiveByCandidacyId(candidacyId).ifPresent(offer -> {
            if (offer.isPending()) {
                offer.withdraw();
                offers.save(offer);
            }
        });

        return applyTransition(candidacy, Candidacy::withdraw, CandidacyEventType.CANDIDACY_WITHDRAWN, studentUserId,
                "CANDIDACY_WITHDRAWN", ipAddress, userAgent);
    }

    private Candidacy recruiterTransition(
            UUID actingUserId, UUID candidacyId, Consumer<Candidacy> action, String eventType,
            String ipAddress, String userAgent) {
        Candidacy candidacy = candidacyAuthorization.requireRecruiterAccess(actingUserId, candidacyId);
        return applyTransition(candidacy, action, eventType, actingUserId, "CANDIDACY_" + eventType, ipAddress, userAgent);
    }

    private Candidacy applyTransition(
            Candidacy candidacy, Consumer<Candidacy> action, String eventType, UUID actorUserId, String auditEvent,
            String ipAddress, String userAgent) {
        CandidacyStatus from = candidacy.getStatus();
        action.accept(candidacy);
        candidacies.save(candidacy);

        events.save(CandidacyEvent.record(candidacy.getId(), eventType, actorUserId, from, candidacy.getStatus(), null));
        audit.record(auditEvent, actorUserId, ipAddress, userAgent, "candidacyId=" + candidacy.getId());
        return candidacy;
    }
}
