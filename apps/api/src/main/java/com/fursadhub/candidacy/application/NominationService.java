package com.fursadhub.candidacy.application;

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
import com.fursadhub.opportunity.domain.OpportunityTarget;
import com.fursadhub.opportunity.domain.OpportunityTargetDepartment;
import com.fursadhub.opportunity.domain.OpportunityTargetDepartmentRepository;
import com.fursadhub.opportunity.domain.OpportunityTargetRepository;
import com.fursadhub.organization.application.OrganizationVerificationGuard;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * University-side nomination of a verified student for a targeted opportunity (CLAUDE.md
 * section 35).
 *
 * <p>Authorization here is deliberately layered, because a role string alone must never grant
 * access (CLAUDE.md section 24). Nominating requires ALL of:
 *
 * <ul>
 *   <li>an active {@code UNIVERSITY_ADMIN}/{@code DEPARTMENT_COORDINATOR} membership at the
 *       university named in the URL;</li>
 *   <li>that membership having scope over the student's OWN department (a coordinator assigned to
 *       Computer Science cannot nominate a Business student);</li>
 *   <li>the student actually being enrolled at that same university;</li>
 *   <li>the opportunity actually targeting that university, and the target permitting the student's
 *       department;</li>
 *   <li>the student's enrollment being VERIFIED and the student being available;</li>
 *   <li>the nomination deadline not having passed.</li>
 * </ul>
 *
 * <p>Creating a nomination does NOT expose the student to the organization — only the student's own
 * consent does that (see {@link NominationConsentService}).
 */
@Service
public class NominationService {

    private final NominationRepository nominations;
    private final OpportunityQueryService opportunities;
    private final OpportunityTargetRepository targets;
    private final OpportunityTargetDepartmentRepository targetDepartments;
    private final OpportunityApplicationRules applicationRules;
    private final OrganizationVerificationGuard verificationGuard;
    private final StudentEligibility studentEligibility;
    private final UniversityAuthorization universityAuthorization;
    private final UniversityRepository universities;
    private final UserRepository users;
    private final EmailOutboxService emailOutbox;
    private final RecruitmentEmailTemplates emailTemplates;
    private final AuditService audit;

    public NominationService(
            NominationRepository nominations, OpportunityQueryService opportunities, OpportunityTargetRepository targets,
            OpportunityTargetDepartmentRepository targetDepartments, OpportunityApplicationRules applicationRules,
            OrganizationVerificationGuard verificationGuard,
            StudentEligibility studentEligibility, UniversityAuthorization universityAuthorization,
            UniversityRepository universities, UserRepository users, EmailOutboxService emailOutbox,
            RecruitmentEmailTemplates emailTemplates, AuditService audit) {
        this.nominations = nominations;
        this.opportunities = opportunities;
        this.targets = targets;
        this.targetDepartments = targetDepartments;
        this.applicationRules = applicationRules;
        this.verificationGuard = verificationGuard;
        this.studentEligibility = studentEligibility;
        this.universityAuthorization = universityAuthorization;
        this.universities = universities;
        this.users = users;
        this.emailOutbox = emailOutbox;
        this.emailTemplates = emailTemplates;
        this.audit = audit;
    }

    @Transactional
    public Nomination nominate(
            UUID actingUserId, UUID universityId, UUID opportunityId, UUID studentUserId, String note,
            String ipAddress, String userAgent) {
        UniversityMembership membership = universityAuthorization.requireMembership(
                actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);

        InternshipOpportunity opportunity = opportunities.getOrThrow(opportunityId);
        applicationRules.requireOpenForNomination(opportunity);
        // Backend Phase B1.5. A nomination is new candidate intake, so it carries the same live
        // organization-verification prerequisite as a self-application. Checked before any
        // student-side lookup so nominating into a suspended organization fails on the
        // organization's state rather than probing the student's enrollment first. Every existing
        // rule below — enrollment, department scope, targeting, deadline, availability,
        // duplicate — is unchanged and in its original order.
        verificationGuard.requireVerifiedForCandidateIntake(opportunity.getOrganizationId());

        // The student's own verified enrollment is the source of truth for which university and
        // department they belong to — never a value supplied by the caller.
        StudentEnrollment enrollment = studentEligibility.requireVerifiedEnrollment(studentUserId);
        if (!enrollment.getUniversityId().equals(universityId)) {
            throw accessDenied();
        }
        // Department isolation: this throws unless the acting membership covers the student's
        // department (whole-university scope for UNIVERSITY_ADMIN).
        universityAuthorization.requireDepartmentScope(membership, enrollment.getDepartmentId());

        OpportunityTarget target = targets.findByOpportunityId(opportunityId).stream()
                .filter(candidate -> candidate.getUniversityId().equals(universityId))
                .findFirst()
                .orElseThrow(() -> new ApiException("OPPORTUNITY_NOT_TARGETED_TO_UNIVERSITY", HttpStatus.FORBIDDEN,
                        "This opportunity is not targeted to your university."));

        requireDepartmentEligibleForTarget(target, enrollment.getDepartmentId());

        if (applicationRules.today().isAfter(target.getNominationDeadline())) {
            throw new ApiException("OPPORTUNITY_DEADLINE_PASSED", HttpStatus.CONFLICT,
                    "The nomination deadline for this opportunity has passed.");
        }

        studentEligibility.requireAvailable(studentUserId);

        if (nominations.existsLiveByOpportunityIdAndStudentUserId(opportunityId, studentUserId)) {
            throw new ApiException("STUDENT_ALREADY_NOMINATED", HttpStatus.CONFLICT,
                    "This student has already been nominated for this opportunity.");
        }

        Nomination nomination = Nomination.create(
                opportunityId, target.getId(), universityId, enrollment.getDepartmentId(), studentUserId,
                actingUserId, note);
        nominations.save(nomination);

        notifyStudent(nomination, opportunity, universityId, studentUserId);

        audit.record("STUDENT_NOMINATED", actingUserId, ipAddress, userAgent,
                "nominationId=" + nomination.getId() + ";opportunityId=" + opportunityId
                        + ";studentUserId=" + studentUserId);
        return nomination;
    }

    /** University staff retracting a nomination the student has not yet responded to. */
    @Transactional
    public Nomination withdraw(UUID actingUserId, UUID universityId, UUID nominationId, String ipAddress, String userAgent) {
        Nomination nomination = nominations.findById(nominationId)
                .filter(candidate -> candidate.getUniversityId().equals(universityId))
                .orElseThrow(() -> new ApiException("NOMINATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Nomination not found."));

        UniversityMembership membership = universityAuthorization.requireMembership(
                actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);
        universityAuthorization.requireDepartmentScope(membership, nomination.getDepartmentId());

        nomination.withdraw();
        nominations.save(nomination);

        audit.record("STUDENT_NOMINATION_WITHDRAWN", actingUserId, ipAddress, userAgent,
                "nominationId=" + nomination.getId());
        return nomination;
    }

    /**
     * A target may restrict itself to specific departments. An empty department list means the whole
     * university is eligible (matching how Phase 3 lets a target be created without departments).
     */
    private void requireDepartmentEligibleForTarget(OpportunityTarget target, UUID departmentId) {
        List<UUID> eligible = targetDepartments.findByOpportunityTargetId(target.getId()).stream()
                .map(OpportunityTargetDepartment::getDepartmentId)
                .toList();
        if (!eligible.isEmpty() && !eligible.contains(departmentId)) {
            throw new ApiException("DEPARTMENT_NOT_ELIGIBLE_FOR_TARGET", HttpStatus.FORBIDDEN,
                    "This opportunity does not accept nominations from that department.");
        }
    }

    private void notifyStudent(Nomination nomination, InternshipOpportunity opportunity, UUID universityId, UUID studentUserId) {
        User student = users.findById(studentUserId).orElseThrow();
        String universityName = universities.findById(universityId).map(University::getName).orElse("Your university");
        RecruitmentEmailTemplates.RenderedEmail email = emailTemplates.studentNominated(
                student.getPreferredLocale(), opportunity.getTitle(), universityName);
        emailOutbox.enqueue(student.getEmail(), email.subject(), email.body());
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
