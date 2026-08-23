package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.CandidacyEventRepository;
import com.fursadhub.candidacy.domain.CandidacyEventType;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import com.fursadhub.candidacy.domain.CandidacyStatus;
import com.fursadhub.candidacy.domain.InternshipOffer;
import com.fursadhub.candidacy.domain.InternshipOfferRepository;
import com.fursadhub.candidacy.infrastructure.RecruitmentEmailTemplates;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.organization.application.OrganizationQueryService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Sending an internship offer to a candidate (CLAUDE.md Phase 4 section 15).
 *
 * <p>An offer and the candidacy's OFFERED status are created together in one transaction, so a
 * candidacy can never show as OFFERED without a real offer record behind it.
 */
@Service
public class SendOfferService {

    private final InternshipOfferRepository offers;
    private final CandidacyRepository candidacies;
    private final CandidacyEventRepository events;
    private final CandidacyAuthorization candidacyAuthorization;
    private final OpportunityQueryService opportunities;
    private final OrganizationQueryService organizations;
    private final OpportunityApplicationRules applicationRules;
    private final StudentEligibility studentEligibility;
    private final UserRepository users;
    private final EmailOutboxService emailOutbox;
    private final RecruitmentEmailTemplates emailTemplates;
    private final AuditService audit;

    public SendOfferService(
            InternshipOfferRepository offers, CandidacyRepository candidacies, CandidacyEventRepository events,
            CandidacyAuthorization candidacyAuthorization, OpportunityQueryService opportunities,
            OrganizationQueryService organizations, OpportunityApplicationRules applicationRules,
            StudentEligibility studentEligibility, UserRepository users, EmailOutboxService emailOutbox,
            RecruitmentEmailTemplates emailTemplates, AuditService audit) {
        this.offers = offers;
        this.candidacies = candidacies;
        this.events = events;
        this.candidacyAuthorization = candidacyAuthorization;
        this.opportunities = opportunities;
        this.organizations = organizations;
        this.applicationRules = applicationRules;
        this.studentEligibility = studentEligibility;
        this.users = users;
        this.emailOutbox = emailOutbox;
        this.emailTemplates = emailTemplates;
        this.audit = audit;
    }

    @Transactional
    public InternshipOffer sendOffer(
            UUID actingUserId, UUID candidacyId, LocalDate startDate, LocalDate endDate, LocalDate responseDeadline,
            String location, String details, String ipAddress, String userAgent) {
        // Resolves organization scope from the candidacy itself, so a recruiter can never offer on
        // another organization's candidate by guessing an id (CLAUDE.md section 26).
        Candidacy candidacy = candidacyAuthorization.requireRecruiterAccess(actingUserId, candidacyId);

        validateDates(startDate, endDate, responseDeadline);

        if (offers.findLiveByCandidacyId(candidacyId).isPresent()) {
            throw new ApiException("OFFER_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "This candidate already has an outstanding or accepted offer.");
        }

        // The student must still be eligible at offer time: an enrollment revoked after they applied,
        // or a placement they accepted elsewhere in the meantime, both block a new offer.
        studentEligibility.requireVerifiedEnrollment(candidacy.getStudentUserId());
        studentEligibility.requireAvailable(candidacy.getStudentUserId());

        InternshipOpportunity opportunity = opportunities.getOrThrow(candidacy.getOpportunityId());

        CandidacyStatus from = candidacy.getStatus();
        candidacy.markOffered();
        candidacies.save(candidacy);

        InternshipOffer offer = InternshipOffer.send(
                candidacyId, startDate, endDate, responseDeadline, location, details, actingUserId);
        offers.save(offer);

        events.save(CandidacyEvent.record(candidacyId, CandidacyEventType.OFFER_SENT, actingUserId, from,
                candidacy.getStatus(), "offerId=" + offer.getId()));

        notifyStudent(candidacy, opportunity, offer);

        audit.record("CANDIDACY_OFFERED", actingUserId, ipAddress, userAgent,
                "candidacyId=" + candidacyId + ";offerId=" + offer.getId());
        return offer;
    }

    /** Organization retracting an offer the student has not responded to yet. */
    @Transactional
    public InternshipOffer withdrawOffer(UUID actingUserId, UUID candidacyId, UUID offerId, String ipAddress, String userAgent) {
        candidacyAuthorization.requireRecruiterAccess(actingUserId, candidacyId);

        InternshipOffer offer = offers.findById(offerId)
                .filter(candidate -> candidate.getCandidacyId().equals(candidacyId))
                .orElseThrow(() -> new ApiException("OFFER_NOT_FOUND", HttpStatus.NOT_FOUND, "Offer not found."));

        offer.withdraw();
        offers.save(offer);

        audit.record("OFFER_WITHDRAWN", actingUserId, ipAddress, userAgent, "offerId=" + offerId);
        return offer;
    }

    private void validateDates(LocalDate startDate, LocalDate endDate, LocalDate responseDeadline) {
        if (startDate == null || endDate == null || responseDeadline == null) {
            throw validationFailed("Start date, end date and response deadline are all required.");
        }
        if (!startDate.isBefore(endDate)) {
            throw validationFailed("The end date must be after the start date.");
        }
        LocalDate today = applicationRules.today();
        if (responseDeadline.isBefore(today)) {
            throw validationFailed("The response deadline cannot be in the past.");
        }
        if (responseDeadline.isAfter(startDate)) {
            throw validationFailed("The response deadline must not be after the internship start date.");
        }
    }

    private void notifyStudent(Candidacy candidacy, InternshipOpportunity opportunity, InternshipOffer offer) {
        users.findById(candidacy.getStudentUserId()).ifPresent(student -> {
            String organizationName = organizations.getOrThrow(candidacy.getOrganizationId()).getName();
            RecruitmentEmailTemplates.RenderedEmail email = emailTemplates.offerReceived(
                    student.getPreferredLocale(), opportunity.getTitle(), organizationName,
                    offer.getResponseDeadline().toString());
            emailOutbox.enqueue(student.getEmail(), email.subject(), email.body());
        });
    }

    private ApiException validationFailed(String message) {
        return new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, message);
    }
}
