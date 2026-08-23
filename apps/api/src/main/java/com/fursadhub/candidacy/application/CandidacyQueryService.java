package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.CandidacyEventRepository;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import com.fursadhub.candidacy.domain.CandidacySource;
import com.fursadhub.candidacy.domain.InternshipOffer;
import com.fursadhub.candidacy.domain.InternshipOfferRepository;
import com.fursadhub.candidacy.domain.ScreeningAnswer;
import com.fursadhub.candidacy.domain.ScreeningAnswerRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read side for candidacies, for both the organization's candidate pool and the student's own view.
 *
 * <p>There is deliberately ONE candidate pool per opportunity, not separate "applicants" and
 * "nominees" lists (CLAUDE.md section 36). Callers may filter by {@link CandidacySource}, but the
 * underlying pipeline is single.
 *
 * <p>Every method is authorized through {@link CandidacyAuthorization}, which resolves organization
 * scope from the candidacy itself rather than from anything the caller supplied.
 */
@Service
public class CandidacyQueryService {

    private final CandidacyRepository candidacies;
    private final CandidacyEventRepository events;
    private final InternshipOfferRepository offers;
    private final ScreeningAnswerRepository screeningAnswers;
    private final CandidacyAuthorization candidacyAuthorization;
    private final OpportunityQueryService opportunities;
    private final OfferExpiryService offerExpiry;
    private final UserRepository users;
    private final StudentProfileRepository studentProfiles;

    public CandidacyQueryService(
            CandidacyRepository candidacies, CandidacyEventRepository events, InternshipOfferRepository offers,
            ScreeningAnswerRepository screeningAnswers, CandidacyAuthorization candidacyAuthorization,
            OpportunityQueryService opportunities, OfferExpiryService offerExpiry,
            UserRepository users, StudentProfileRepository studentProfiles) {
        this.candidacies = candidacies;
        this.events = events;
        this.offers = offers;
        this.screeningAnswers = screeningAnswers;
        this.candidacyAuthorization = candidacyAuthorization;
        this.opportunities = opportunities;
        this.offerExpiry = offerExpiry;
        this.users = users;
        this.studentProfiles = studentProfiles;
    }

    /** One row of the organization's unified candidate pool. */
    public record CandidateRow(
            Candidacy candidacy, String studentEmail, String studentFullName, Optional<InternshipOffer> liveOffer) {
    }

    /** Full detail for one candidate, as the organization sees it. */
    public record CandidateDetail(
            Candidacy candidacy, String studentEmail, String studentFullName, List<ScreeningAnswer> answers,
            List<InternshipOffer> offers, List<CandidacyEvent> history) {
    }

    /** One row of a student's own "My applications" list. */
    public record StudentCandidacyRow(
            Candidacy candidacy, InternshipOpportunity opportunity, Optional<InternshipOffer> liveOffer) {
    }

    /**
     * The organization's candidate pool for one opportunity. Requires an active
     * ADMIN/RECRUITER membership at the opportunity's OWN organization.
     */
    @Transactional(readOnly = true)
    public List<CandidateRow> listForOpportunity(UUID actingUserId, UUID opportunityId, CandidacySource sourceFilter) {
        InternshipOpportunity opportunity = opportunities.getOrThrow(opportunityId);
        candidacyAuthorization.requireRecruiterAccessToOrganization(actingUserId, opportunity.getOrganizationId());

        return candidacies.findByOpportunityId(opportunityId).stream()
                .filter(candidacy -> matchesSource(candidacy, sourceFilter))
                .map(candidacy -> new CandidateRow(
                        candidacy,
                        emailOf(candidacy.getStudentUserId()),
                        fullNameOf(candidacy.getStudentUserId()),
                        liveOfferAfterExpiry(candidacy)))
                .toList();
    }

    @Transactional(readOnly = true)
    public CandidateDetail getForRecruiter(UUID actingUserId, UUID candidacyId) {
        Candidacy candidacy = candidacyAuthorization.requireRecruiterAccess(actingUserId, candidacyId);
        liveOfferAfterExpiry(candidacy);

        return new CandidateDetail(
                candidacy,
                emailOf(candidacy.getStudentUserId()),
                fullNameOf(candidacy.getStudentUserId()),
                screeningAnswers.findByCandidacyId(candidacyId),
                offers.findByCandidacyIdOrderByCreatedAtDesc(candidacyId),
                events.findByCandidacyIdOrderByOccurredAt(candidacyId));
    }

    /** A student's own candidacies. Always scoped to the authenticated caller. */
    @Transactional(readOnly = true)
    public List<StudentCandidacyRow> listForStudent(UUID studentUserId) {
        return candidacies.findByStudentUserId(studentUserId).stream()
                .map(candidacy -> new StudentCandidacyRow(
                        candidacy,
                        opportunities.getOrThrow(candidacy.getOpportunityId()),
                        liveOfferAfterExpiry(candidacy)))
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentCandidacyRow getForStudent(UUID studentUserId, UUID candidacyId) {
        Candidacy candidacy = candidacyAuthorization.requireOwningStudent(studentUserId, candidacyId);
        return new StudentCandidacyRow(
                candidacy, opportunities.getOrThrow(candidacy.getOpportunityId()), liveOfferAfterExpiry(candidacy));
    }

    /** Every offer a student currently has, newest first, with lapsed ones already expired. */
    @Transactional(readOnly = true)
    public List<InternshipOffer> listOffersForStudent(UUID studentUserId) {
        List<Candidacy> own = candidacies.findByStudentUserId(studentUserId);
        own.forEach(this::liveOfferAfterExpiry);

        return offers.findByCandidacyIdIn(own.stream().map(Candidacy::getId).toList()).stream()
                .sorted(Comparator.comparing(InternshipOffer::getCreatedAt).reversed())
                .toList();
    }

    /**
     * Applies lazy expiry before reporting an offer, so a lapsed offer is never shown as still
     * awaiting a response (Phase 4 section 21). The expiry commits in its own transaction, so the
     * offer is then re-read to report its true post-expiry state rather than the stale row.
     */
    private Optional<InternshipOffer> liveOfferAfterExpiry(Candidacy candidacy) {
        Optional<InternshipOffer> live = offers.findLiveByCandidacyId(candidacy.getId());
        if (live.isEmpty()) {
            return live;
        }
        offerExpiry.expireIfLapsed(live.get().getId());
        return offers.findLiveByCandidacyId(candidacy.getId());
    }

    private boolean matchesSource(Candidacy candidacy, CandidacySource filter) {
        if (filter == null) {
            return true;
        }
        // A BOTH candidacy legitimately belongs to both the "applied" and "nominated" views.
        return candidacy.getSource() == filter || candidacy.getSource() == CandidacySource.BOTH;
    }

    private String emailOf(UUID userId) {
        return users.findById(userId).map(User::getEmail).orElse(null);
    }

    private String fullNameOf(UUID userId) {
        return studentProfiles.findByUserId(userId).map(StudentProfile::getFullName).orElse(null);
    }
}
