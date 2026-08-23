package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Nomination;
import com.fursadhub.candidacy.domain.NominationRepository;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityTarget;
import com.fursadhub.opportunity.domain.OpportunityTargetDepartment;
import com.fursadhub.opportunity.domain.OpportunityTargetDepartmentRepository;
import com.fursadhub.opportunity.domain.OpportunityTargetRepository;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipDepartment;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityRole;
import com.fursadhub.verification.domain.StudentVerificationStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Read side for nominations, for both the university staff queue and the student's consent inbox.
 *
 * <p>Staff results are scoped exactly like the Phase 2 verification queue: whole university for
 * {@code UNIVERSITY_ADMIN}, assigned departments only for a {@code DEPARTMENT_COORDINATOR}
 * (CLAUDE.md section 25 — department isolation). Filtering here is a real authorization boundary,
 * not a UI convenience.
 */
@Service
@Transactional(readOnly = true)
public class NominationQueryService {

    private final NominationRepository nominations;
    private final OpportunityTargetRepository targets;
    private final OpportunityTargetDepartmentRepository targetDepartments;
    private final OpportunityQueryService opportunities;
    private final OrganizationQueryService organizations;
    private final StudentEnrollmentRepository enrollments;
    private final StudentProfileRepository studentProfiles;
    private final UniversityAuthorization universityAuthorization;
    private final UniversityMembershipDepartmentRepository membershipDepartments;
    private final UserRepository users;

    public NominationQueryService(
            NominationRepository nominations, OpportunityTargetRepository targets,
            OpportunityTargetDepartmentRepository targetDepartments, OpportunityQueryService opportunities,
            OrganizationQueryService organizations, StudentEnrollmentRepository enrollments,
            StudentProfileRepository studentProfiles, UniversityAuthorization universityAuthorization,
            UniversityMembershipDepartmentRepository membershipDepartments, UserRepository users) {
        this.nominations = nominations;
        this.targets = targets;
        this.targetDepartments = targetDepartments;
        this.opportunities = opportunities;
        this.organizations = organizations;
        this.enrollments = enrollments;
        this.studentProfiles = studentProfiles;
        this.universityAuthorization = universityAuthorization;
        this.membershipDepartments = membershipDepartments;
        this.users = users;
    }

    /** A nomination as university staff see it. */
    public record NominationRow(
            Nomination nomination, String opportunityTitle, String organizationName, String studentEmail,
            String studentFullName) {
    }

    /** A nomination as the nominated student sees it. */
    public record StudentNominationRow(
            Nomination nomination, String opportunityTitle, String organizationName, String universityName) {
    }

    /** A targeted opportunity request awaiting nominations from this university. */
    public record TargetRequestRow(
            OpportunityTarget target, InternshipOpportunity opportunity, String organizationName,
            List<UUID> eligibleDepartmentIds, int liveNominationCount) {
    }

    /** A student this coordinator may legitimately nominate. */
    public record EligibleStudentRow(
            UUID studentUserId, String email, String fullName, UUID departmentId, String studentNumber,
            String program, String academicYear, boolean alreadyNominated) {
    }

    public List<NominationRow> listForUniversity(UUID staffUserId, UUID universityId) {
        UniversityMembership membership = universityAuthorization.requireMembership(
                staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);

        List<Nomination> scoped = membership.getRole() == UniversityRole.UNIVERSITY_ADMIN
                ? nominations.findByUniversityId(universityId)
                : nominations.findByUniversityIdAndDepartmentIdIn(universityId, assignedDepartmentIds(membership));

        return scoped.stream().map(this::toRow).toList();
    }

    public List<StudentNominationRow> listForStudent(UUID studentUserId) {
        return nominations.findByStudentUserId(studentUserId).stream()
                .map(nomination -> {
                    InternshipOpportunity opportunity = opportunities.getOrThrow(nomination.getOpportunityId());
                    return new StudentNominationRow(
                            nomination,
                            opportunity.getTitle(),
                            organizations.getOrThrow(opportunity.getOrganizationId()).getName(),
                            null);
                })
                .toList();
    }

    /**
     * Published opportunities currently targeting this university. Only PUBLISHED ones appear: a
     * draft or cancelled opportunity must never surface in a university's work queue.
     */
    public List<TargetRequestRow> listTargetRequests(UUID staffUserId, UUID universityId) {
        universityAuthorization.requireMembership(
                staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);

        return opportunities.listPublishedTargetingUniversity(universityId).stream()
                .flatMap(opportunity -> targets.findByOpportunityId(opportunity.getId()).stream()
                        .filter(target -> target.getUniversityId().equals(universityId))
                        .map(target -> new TargetRequestRow(
                                target,
                                opportunity,
                                organizations.getOrThrow(opportunity.getOrganizationId()).getName(),
                                targetDepartments.findByOpportunityTargetId(target.getId()).stream()
                                        .map(OpportunityTargetDepartment::getDepartmentId)
                                        .toList(),
                                nominations.countLiveByOpportunityTargetId(target.getId()))))
                .toList();
    }

    /**
     * The students this caller may nominate for one target: VERIFIED enrollments, inside the
     * caller's own department scope, and inside the target's eligible departments. This mirrors the
     * checks {@link NominationService} enforces on write — the list is a convenience, never the
     * security boundary.
     */
    public List<EligibleStudentRow> listEligibleStudents(UUID staffUserId, UUID universityId, UUID targetId) {
        UniversityMembership membership = universityAuthorization.requireMembership(
                staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);

        OpportunityTarget target = targets.findById(targetId)
                .filter(candidate -> candidate.getUniversityId().equals(universityId))
                .orElseThrow(() -> new ApiException(
                        "OPPORTUNITY_TARGET_NOT_FOUND", HttpStatus.NOT_FOUND, "Target not found."));

        List<UUID> targetDepartmentIds = targetDepartments.findByOpportunityTargetId(targetId).stream()
                .map(OpportunityTargetDepartment::getDepartmentId)
                .toList();

        List<UUID> scopedDepartmentIds = membership.getRole() == UniversityRole.UNIVERSITY_ADMIN
                ? null
                : assignedDepartmentIds(membership);

        return enrollments.findByUniversityId(universityId).stream()
                .filter(enrollment -> enrollment.getVerificationStatus() == StudentVerificationStatus.VERIFIED)
                .filter(enrollment -> targetDepartmentIds.isEmpty() || targetDepartmentIds.contains(enrollment.getDepartmentId()))
                .filter(enrollment -> scopedDepartmentIds == null || scopedDepartmentIds.contains(enrollment.getDepartmentId()))
                .map(enrollment -> toEligibleRow(enrollment, target.getOpportunityId()))
                .toList();
    }

    private EligibleStudentRow toEligibleRow(StudentEnrollment enrollment, UUID opportunityId) {
        return new EligibleStudentRow(
                enrollment.getStudentUserId(),
                emailOf(enrollment.getStudentUserId()),
                fullNameOf(enrollment.getStudentUserId()),
                enrollment.getDepartmentId(),
                enrollment.getStudentNumber(),
                enrollment.getProgram(),
                enrollment.getAcademicYear(),
                nominations.existsLiveByOpportunityIdAndStudentUserId(opportunityId, enrollment.getStudentUserId()));
    }

    private NominationRow toRow(Nomination nomination) {
        InternshipOpportunity opportunity = opportunities.getOrThrow(nomination.getOpportunityId());
        return new NominationRow(
                nomination,
                opportunity.getTitle(),
                organizations.getOrThrow(opportunity.getOrganizationId()).getName(),
                emailOf(nomination.getStudentUserId()),
                fullNameOf(nomination.getStudentUserId()));
    }

    private List<UUID> assignedDepartmentIds(UniversityMembership membership) {
        return membershipDepartments.findActiveByMembershipId(membership.getId()).stream()
                .map(UniversityMembershipDepartment::getDepartmentId)
                .toList();
    }

    private String emailOf(UUID userId) {
        return users.findById(userId).map(User::getEmail).orElse(null);
    }

    private String fullNameOf(UUID userId) {
        return studentProfiles.findByUserId(userId).map(StudentProfile::getFullName).orElse(null);
    }
}
