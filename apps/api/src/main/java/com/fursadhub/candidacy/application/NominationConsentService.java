package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacySource;
import com.fursadhub.candidacy.domain.Nomination;
import com.fursadhub.candidacy.domain.NominationRepository;
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
import com.fursadhub.student.domain.StudentEnrollment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Student consent to a nomination (CLAUDE.md section 35, Phase 4 section 5).
 *
 * <p>Consent is mandatory and it is the moment the organization first gains any access to the
 * student: a {@code PENDING_STUDENT_CONSENT} nomination has no candidacy behind it, so the
 * organization's candidate pool simply does not contain the student. Accepting creates (or merges
 * into) the candidacy; declining creates nothing.
 *
 * <p>Only the nominated student may respond, and the student is always the authenticated caller —
 * no student id is accepted from the request (CLAUDE.md section 12).
 */
@Service
public class NominationConsentService {

    private final NominationRepository nominations;
    private final OpportunityQueryService opportunities;
    private final OpportunityApplicationRules applicationRules;
    private final StudentEligibility studentEligibility;
    private final CandidacyMerger candidacyMerger;
    private final OrganizationMembershipRepository organizationMemberships;
    private final UserRepository users;
    private final EmailOutboxService emailOutbox;
    private final RecruitmentEmailTemplates emailTemplates;
    private final AuditService audit;

    public NominationConsentService(
            NominationRepository nominations, OpportunityQueryService opportunities,
            OpportunityApplicationRules applicationRules, StudentEligibility studentEligibility,
            CandidacyMerger candidacyMerger, OrganizationMembershipRepository organizationMemberships,
            UserRepository users, EmailOutboxService emailOutbox, RecruitmentEmailTemplates emailTemplates,
            AuditService audit) {
        this.nominations = nominations;
        this.opportunities = opportunities;
        this.applicationRules = applicationRules;
        this.studentEligibility = studentEligibility;
        this.candidacyMerger = candidacyMerger;
        this.organizationMemberships = organizationMemberships;
        this.users = users;
        this.emailOutbox = emailOutbox;
        this.emailTemplates = emailTemplates;
        this.audit = audit;
    }

    /**
     * Accepting means "I agree to be considered" — NOT acceptance of an internship offer
     * (CLAUDE.md section 35). One transaction: mark the nomination accepted AND create/merge the
     * candidacy (CLAUDE.md section 54), so the organization can never see a candidacy whose
     * nomination did not commit, or vice versa.
     */
    @Transactional
    public Candidacy accept(UUID studentUserId, UUID nominationId, String ipAddress, String userAgent) {
        Nomination nomination = requireOwnPendingNomination(studentUserId, nominationId);

        InternshipOpportunity opportunity = opportunities.getOrThrow(nomination.getOpportunityId());
        applicationRules.requireOpenForNomination(opportunity);

        StudentEnrollment enrollment = studentEligibility.requireVerifiedEnrollment(studentUserId);
        studentEligibility.requireAvailable(studentUserId);

        nomination.accept();
        nominations.save(nomination);

        CandidacyMerger.MergeResult result = candidacyMerger.createOrMerge(
                opportunity, enrollment, CandidacySource.UNIVERSITY_NOMINATION, studentUserId);

        notifyOrganization(opportunity, studentUserId, true);

        audit.record("NOMINATION_ACCEPTED", studentUserId, ipAddress, userAgent,
                "nominationId=" + nominationId + ";candidacyId=" + result.candidacy().getId());
        return result.candidacy();
    }

    /** Declining creates no candidacy, so the organization never learns the student was nominated. */
    @Transactional
    public Nomination decline(UUID studentUserId, UUID nominationId, String ipAddress, String userAgent) {
        Nomination nomination = requireOwnPendingNomination(studentUserId, nominationId);

        nomination.decline();
        nominations.save(nomination);

        audit.record("NOMINATION_DECLINED", studentUserId, ipAddress, userAgent, "nominationId=" + nominationId);
        return nomination;
    }

    /**
     * Ownership check. A nomination belonging to another student is reported as NOT FOUND rather
     * than FORBIDDEN so that probing ids cannot confirm another student's nomination exists
     * (CLAUDE.md section 12 — changing a UUID must not expose another student's data).
     */
    private Nomination requireOwnPendingNomination(UUID studentUserId, UUID nominationId) {
        Nomination nomination = nominations.findById(nominationId)
                .filter(candidate -> candidate.getStudentUserId().equals(studentUserId))
                .orElseThrow(() -> new ApiException("NOMINATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Nomination not found."));

        if (!nomination.isPendingConsent()) {
            throw new ApiException("NOMINATION_ALREADY_RESOLVED", HttpStatus.CONFLICT,
                    "This nomination has already been responded to.");
        }
        return nomination;
    }

    /**
     * Best-effort notification to the organization's admins/recruiters. Enqueued into the outbox
     * inside this transaction, so SMTP availability never affects whether consent succeeded
     * (CLAUDE.md section 55).
     */
    private void notifyOrganization(InternshipOpportunity opportunity, UUID studentUserId, boolean accepted) {
        String studentEmail = users.findById(studentUserId).map(User::getEmail).orElse("A student");

        organizationMemberships.findByOrganizationId(opportunity.getOrganizationId()).stream()
                .filter(OrganizationMembership::isActive)
                .filter(membership -> membership.getRole() != com.fursadhub.organization.domain.OrganizationRole.ORGANIZATION_SUPERVISOR)
                .forEach(membership -> users.findById(membership.getUserId()).ifPresent(recipient -> {
                    RecruitmentEmailTemplates.RenderedEmail email = emailTemplates.nominationResolved(
                            recipient.getPreferredLocale(), opportunity.getTitle(), studentEmail, accepted);
                    emailOutbox.enqueue(recipient.getEmail(), email.subject(), email.body());
                }));
    }
}
