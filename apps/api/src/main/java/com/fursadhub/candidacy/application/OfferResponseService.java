package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.CandidacyEventRepository;
import com.fursadhub.candidacy.domain.CandidacyEventType;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import com.fursadhub.candidacy.domain.CandidacyStatus;
import com.fursadhub.candidacy.domain.InternshipOffer;
import com.fursadhub.candidacy.domain.InternshipOfferRepository;
import com.fursadhub.candidacy.domain.OfferStatus;
import com.fursadhub.candidacy.infrastructure.RecruitmentEmailTemplates;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The student's response to an internship offer (CLAUDE.md section 38, Phase 4 section 16-20).
 *
 * <p>Acceptance is one of the most important transactions in FursadHub, and it either commits
 * entirely or not at all: offer ACCEPTED, candidacy ACCEPTED, exactly one PLANNED placement,
 * history and audit. There is no reachable state where an offer is accepted but no placement
 * exists, or a placement exists while the candidacy is still OFFERED.
 *
 * <p><strong>Idempotency.</strong> The offer row is read {@code FOR UPDATE} before anything else, so
 * a double-clicked or concurrently retried acceptance blocks until the first transaction commits and
 * then observes the already-ACCEPTED offer. That second call returns the placement the first one
 * created instead of creating another — and {@code UNIQUE(candidacy_id)} on placements is the
 * database-level guarantee behind that behaviour (CLAUDE.md section 52).
 *
 * <p><strong>Expiry.</strong> A lapsed offer is transitioned lazily, inside whichever transaction
 * first notices the deadline has passed, so the pilot needs no scheduler (Phase 4 section 21).
 */
@Service
public class OfferResponseService {

    private final InternshipOfferRepository offers;
    private final CandidacyRepository candidacies;
    private final CandidacyEventRepository events;
    private final PlacementRepository placements;
    private final OpportunityQueryService opportunities;
    private final OfferExpiryService offerExpiry;
    private final StudentEligibility studentEligibility;
    private final OrganizationMembershipRepository organizationMemberships;
    private final UserRepository users;
    private final EmailOutboxService emailOutbox;
    private final RecruitmentEmailTemplates emailTemplates;
    private final AuditService audit;

    public OfferResponseService(
            InternshipOfferRepository offers, CandidacyRepository candidacies, CandidacyEventRepository events,
            PlacementRepository placements, OpportunityQueryService opportunities, OfferExpiryService offerExpiry,
            StudentEligibility studentEligibility, OrganizationMembershipRepository organizationMemberships,
            UserRepository users, EmailOutboxService emailOutbox, RecruitmentEmailTemplates emailTemplates,
            AuditService audit) {
        this.offers = offers;
        this.candidacies = candidacies;
        this.events = events;
        this.placements = placements;
        this.opportunities = opportunities;
        this.offerExpiry = offerExpiry;
        this.studentEligibility = studentEligibility;
        this.organizationMemberships = organizationMemberships;
        this.users = users;
        this.emailOutbox = emailOutbox;
        this.emailTemplates = emailTemplates;
        this.audit = audit;
    }

    /** The accepted offer together with the single placement it produced. */
    public record AcceptanceResult(InternshipOffer offer, Candidacy candidacy, Placement placement, boolean alreadyAccepted) {
    }

    @Transactional
    public AcceptanceResult accept(UUID studentUserId, UUID offerId, String ipAddress, String userAgent) {
        // Lazy expiry runs first, in its own committed transaction, BEFORE this transaction locks
        // the offer row — both because expiring must survive the rejection that follows it, and
        // because locking the row here first would deadlock against that inner transaction.
        offerExpiry.expireIfLapsed(offerId);

        // FOR UPDATE: this is what serializes concurrent acceptances of the same offer.
        InternshipOffer offer = offers.findByIdForUpdate(offerId)
                .orElseThrow(this::offerNotFound);

        Candidacy candidacy = candidacies.findById(offer.getCandidacyId()).orElseThrow(this::offerNotFound);

        // Ownership: offer -> candidacy -> student -> authenticated caller. Another student's offer
        // is reported as NOT FOUND so probing ids cannot confirm it exists.
        if (!candidacy.getStudentUserId().equals(studentUserId)) {
            throw offerNotFound();
        }

        // The retry/double-click path: the first transaction already did everything, so return its
        // result rather than attempting a second placement. Checked before the expiry/pending
        // guards, since an already-accepted offer is a success to repeat, not an error.
        if (offer.isAccepted()) {
            Placement existing = placements.findByCandidacyId(candidacy.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Accepted offer " + offerId + " has no placement — this must never happen"));
            return new AcceptanceResult(offer, candidacy, existing, true);
        }

        if (!offer.isPending()) {
            throw new ApiException("OFFER_NOT_PENDING", HttpStatus.CONFLICT,
                    "This offer is no longer awaiting a response.");
        }
        if (candidacy.getStatus() != CandidacyStatus.OFFERED) {
            throw new ApiException("CANDIDACY_INVALID_TRANSITION", HttpStatus.CONFLICT,
                    "This candidacy is not awaiting an offer response.");
        }

        // Re-checked at acceptance time, not just at offer time: enrollment may have been revoked,
        // or the student may have accepted a different placement in the meantime.
        studentEligibility.requireVerifiedEnrollment(studentUserId);
        studentEligibility.requireAvailable(studentUserId);

        InternshipOpportunity opportunity = opportunities.getOrThrow(candidacy.getOpportunityId());

        offer.accept();
        offers.save(offer);

        CandidacyStatus from = candidacy.getStatus();
        candidacy.markOfferAccepted();
        candidacies.save(candidacy);

        // Exactly one placement. Availability is DERIVED from this row existing (see V22), so
        // creating it IS the availability update required by CLAUDE.md section 38 step 4.
        Placement placement = Placement.planFromAcceptedOffer(
                candidacy.getId(), offer.getId(), candidacy.getOpportunityId(), studentUserId,
                candidacy.getOrganizationId(), candidacy.getUniversityId(), candidacy.getDepartmentId(),
                offer.getStartDate(), offer.getEndDate(), offer.getLocation());
        placements.save(placement);

        events.save(CandidacyEvent.record(candidacy.getId(), CandidacyEventType.OFFER_ACCEPTED, studentUserId,
                from, candidacy.getStatus(), "offerId=" + offer.getId()));
        events.save(CandidacyEvent.record(candidacy.getId(), CandidacyEventType.PLACEMENT_CREATED, studentUserId,
                candidacy.getStatus(), candidacy.getStatus(), "placementId=" + placement.getId()));

        notifyOrganization(candidacy, opportunity, studentUserId, true);

        audit.record("OFFER_ACCEPTED", studentUserId, ipAddress, userAgent,
                "offerId=" + offer.getId() + ";candidacyId=" + candidacy.getId());
        audit.record("PLACEMENT_STARTED", studentUserId, ipAddress, userAgent,
                "placementId=" + placement.getId() + ";candidacyId=" + candidacy.getId());

        return new AcceptanceResult(offer, candidacy, placement, false);
    }

    /**
     * Declining atomically marks the offer DECLINED and the candidacy OFFER_DECLINED. A repeated
     * decline is a safe no-op rather than an inconsistent state (Phase 4 section 20).
     */
    @Transactional
    public InternshipOffer decline(UUID studentUserId, UUID offerId, String ipAddress, String userAgent) {
        // Same ordering rule as accept(): expire in its own transaction before locking the row here.
        offerExpiry.expireIfLapsed(offerId);

        InternshipOffer offer = offers.findByIdForUpdate(offerId).orElseThrow(this::offerNotFound);
        Candidacy candidacy = candidacies.findById(offer.getCandidacyId()).orElseThrow(this::offerNotFound);

        if (!candidacy.getStudentUserId().equals(studentUserId)) {
            throw offerNotFound();
        }
        // Repeating a decline is a safe no-op rather than an error (Phase 4 section 20).
        if (offer.getStatus() == OfferStatus.DECLINED) {
            return offer;
        }

        if (!offer.isPending()) {
            throw new ApiException("OFFER_NOT_PENDING", HttpStatus.CONFLICT,
                    "This offer is no longer awaiting a response.");
        }

        InternshipOpportunity opportunity = opportunities.getOrThrow(candidacy.getOpportunityId());

        offer.decline();
        offers.save(offer);

        CandidacyStatus from = candidacy.getStatus();
        candidacy.markOfferDeclined();
        candidacies.save(candidacy);

        events.save(CandidacyEvent.record(candidacy.getId(), CandidacyEventType.OFFER_DECLINED, studentUserId,
                from, candidacy.getStatus(), "offerId=" + offer.getId()));

        notifyOrganization(candidacy, opportunity, studentUserId, false);

        audit.record("OFFER_DECLINED", studentUserId, ipAddress, userAgent, "offerId=" + offer.getId());
        return offer;
    }

    private void notifyOrganization(Candidacy candidacy, InternshipOpportunity opportunity, UUID studentUserId, boolean accepted) {
        String studentEmail = users.findById(studentUserId).map(User::getEmail).orElse("A student");

        organizationMemberships.findByOrganizationId(candidacy.getOrganizationId()).stream()
                .filter(OrganizationMembership::isActive)
                .filter(membership -> membership.getRole() != OrganizationRole.ORGANIZATION_SUPERVISOR)
                .forEach(membership -> users.findById(membership.getUserId()).ifPresent(recipient -> {
                    RecruitmentEmailTemplates.RenderedEmail email = accepted
                            ? emailTemplates.offerAccepted(recipient.getPreferredLocale(), opportunity.getTitle(), studentEmail)
                            : emailTemplates.offerDeclined(recipient.getPreferredLocale(), opportunity.getTitle(), studentEmail);
                    emailOutbox.enqueue(recipient.getEmail(), email.subject(), email.body());
                }));
    }

    private ApiException offerNotFound() {
        return new ApiException("OFFER_NOT_FOUND", HttpStatus.NOT_FOUND, "Offer not found.");
    }
}
