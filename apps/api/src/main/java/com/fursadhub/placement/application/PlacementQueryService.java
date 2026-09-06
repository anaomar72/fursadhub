package com.fursadhub.placement.application;

import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementSupervisorAssignment;
import com.fursadhub.placement.domain.PlacementSupervisorAssignmentRepository;
import com.fursadhub.placement.domain.SupervisorType;
import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipDepartment;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read side for placements, for the student, university and organization areas.
 *
 * <p>Every listing is scoped in the QUERY, not filtered afterwards in the UI: a department
 * coordinator's list is built from their assigned departments, and a supervisor's list is built from
 * their active assignments, so an out-of-scope placement is never loaded in the first place. Detail
 * reads go through {@link PlacementAuthorization}, which resolves scope from the placement itself.
 */
@Service
public class PlacementQueryService {

    private final PlacementRepository placements;
    private final PlacementSupervisorAssignmentRepository assignments;
    private final PlacementAuthorization authorization;
    private final UniversityMembershipDepartmentRepository membershipDepartments;
    private final InternshipOpportunityRepository opportunities;
    private final OrganizationRepository organizations;
    private final UniversityRepository universities;
    private final DepartmentRepository departments;
    private final UserRepository users;
    private final StudentProfileRepository studentProfiles;
    private final UniversityMembershipRepository universityMemberships;
    private final OrganizationMembershipRepository organizationMemberships;

    public PlacementQueryService(
            PlacementRepository placements, PlacementSupervisorAssignmentRepository assignments,
            PlacementAuthorization authorization, UniversityMembershipDepartmentRepository membershipDepartments,
            InternshipOpportunityRepository opportunities, OrganizationRepository organizations,
            UniversityRepository universities, DepartmentRepository departments,
            UserRepository users, StudentProfileRepository studentProfiles,
            UniversityMembershipRepository universityMemberships,
            OrganizationMembershipRepository organizationMemberships) {
        this.placements = placements;
        this.assignments = assignments;
        this.authorization = authorization;
        this.membershipDepartments = membershipDepartments;
        this.opportunities = opportunities;
        this.organizations = organizations;
        this.universities = universities;
        this.departments = departments;
        this.users = users;
        this.studentProfiles = studentProfiles;
        this.universityMemberships = universityMemberships;
        this.organizationMemberships = organizationMemberships;
    }

    /**
     * One placement with the context every area needs to render it. Supervisors are carried as the
     * CURRENT holders of each post; the full history is a separate, deliberately explicit read.
     */
    public record PlacementView(
            Placement placement,
            String opportunityTitle,
            String organizationName,
            String universityName,
            String departmentName,
            String studentFullName,
            String studentEmail,
            Optional<SupervisorView> universitySupervisor,
            Optional<SupervisorView> organizationSupervisor) {
    }

    /**
     * One supervisor assignment resolved to a displayable person. Staff are identified by email:
     * FursadHub stores no name on {@code User}, and {@code StudentProfile} is student-only, so this
     * matches how Phase 3 renders university and organization staff.
     */
    public record SupervisorView(PlacementSupervisorAssignment assignment, String displayName, String email) {
    }

    /** A staff member who may be picked as a supervisor for a given placement. */
    public record EligibleSupervisor(UUID userId, String displayName, String email) {
    }

    // ---------------------------------------------------------------- student

    /** A student's own placements. Always scoped to the authenticated caller, never to a supplied id. */
    @Transactional(readOnly = true)
    public List<PlacementView> listForStudent(UUID studentUserId) {
        return toViews(placements.findByStudentUserId(studentUserId));
    }

    /**
     * One of the student's own placements. Another student's placement is reported as NOT FOUND, so
     * swapping the UUID in the URL cannot even confirm it exists.
     */
    @Transactional(readOnly = true)
    public PlacementView getForStudent(UUID studentUserId, UUID placementId) {
        return toView(authorization.requireOwningStudent(studentUserId, placementId));
    }

    // ---------------------------------------------------------------- any authorized actor

    /** Detail for whichever party the caller is — student, university staff, or organization staff. */
    @Transactional(readOnly = true)
    public PlacementView getForActor(UUID actingUserId, UUID placementId) {
        return toView(authorization.requireReadAccess(actingUserId, placementId));
    }

    // ---------------------------------------------------------------- university

    /**
     * University-scoped listing, narrowed by the caller's actual role:
     * <ul>
     *   <li>{@code UNIVERSITY_ADMIN} — every placement at their university.</li>
     *   <li>{@code DEPARTMENT_COORDINATOR} — only their assigned departments, resolved from
     *       membership scope rather than from a department id the caller could supply.</li>
     *   <li>{@code UNIVERSITY_SUPERVISOR} — only the placements they are actively assigned to.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public List<PlacementView> listForUniversity(UUID actingUserId, UUID universityId) {
        UniversityMembership membership = authorization.requireUniversityMembership(actingUserId, universityId);

        return switch (membership.getRole()) {
            case UNIVERSITY_ADMIN -> toViews(placements.findByUniversityId(universityId));
            case DEPARTMENT_COORDINATOR -> {
                List<UUID> scopedDepartments = membershipDepartments.findActiveByMembershipId(membership.getId())
                        .stream()
                        .map(UniversityMembershipDepartment::getDepartmentId)
                        .toList();
                yield toViews(placements.findByUniversityIdAndDepartmentIdIn(universityId, scopedDepartments));
            }
            case UNIVERSITY_SUPERVISOR -> toViews(assignedPlacements(actingUserId, SupervisorType.UNIVERSITY));
        };
    }

    // ---------------------------------------------------------------- organization

    /**
     * Organization-scoped listing. Admins and recruiters see their organization's placements;
     * an {@code ORGANIZATION_SUPERVISOR} sees only what they are actively assigned to, never the
     * organization's wider pipeline.
     */
    @Transactional(readOnly = true)
    public List<PlacementView> listForOrganization(UUID actingUserId, UUID organizationId) {
        OrganizationMembership membership = authorization.requireOrganizationMembership(actingUserId, organizationId);

        return switch (membership.getRole()) {
            case ORGANIZATION_ADMIN, RECRUITER -> toViews(placements.findByOrganizationId(organizationId));
            case ORGANIZATION_SUPERVISOR -> toViews(assignedPlacements(actingUserId, SupervisorType.ORGANIZATION));
        };
    }

    // ---------------------------------------------------------------- helpers

    /**
     * The placements a supervisor currently holds, of one type. Closed assignments are excluded, so
     * access ends exactly when the assignment is closed rather than lingering.
     */
    private List<Placement> assignedPlacements(UUID supervisorUserId, SupervisorType type) {
        List<UUID> placementIds = assignments.findActiveBySupervisorUserId(supervisorUserId).stream()
                .filter(assignment -> assignment.getType() == type)
                .map(PlacementSupervisorAssignment::getPlacementId)
                .toList();
        return placements.findByIdIn(placementIds);
    }

    private List<PlacementView> toViews(List<Placement> rows) {
        return rows.stream().map(this::toView).toList();
    }

    private PlacementView toView(Placement placement) {
        return new PlacementView(
                placement,
                opportunities.findById(placement.getOpportunityId())
                        .map(InternshipOpportunity::getTitle).orElse(null),
                organizations.findById(placement.getOrganizationId())
                        .map(Organization::getName).orElse(null),
                universities.findById(placement.getUniversityId())
                        .map(University::getName).orElse(null),
                departments.findById(placement.getDepartmentId())
                        .map(Department::getName).orElse(null),
                studentProfiles.findByUserId(placement.getStudentUserId())
                        .map(StudentProfile::getFullName).orElse(null),
                users.findById(placement.getStudentUserId()).map(User::getEmail).orElse(null),
                supervisorView(placement.getId(), SupervisorType.UNIVERSITY),
                supervisorView(placement.getId(), SupervisorType.ORGANIZATION));
    }

    private Optional<SupervisorView> supervisorView(UUID placementId, SupervisorType type) {
        return assignments.findActive(placementId, type).map(this::toSupervisorView);
    }

    /** Resolves an assignment to a person. Used for both the current holder and history rows. */
    public SupervisorView toSupervisorView(PlacementSupervisorAssignment assignment) {
        // One lookup for both fields — the display name is read from the User this already loads,
        // so Backend Phase B5 adds no query here.
        return users.findById(assignment.getSupervisorUserId())
                .map(user -> new SupervisorView(assignment, user.getDisplayName(), user.getEmail()))
                .orElseGet(() -> new SupervisorView(assignment, null, null));
    }

    // ---------------------------------------------------------------- eligible supervisors

    /**
     * The university supervisors who may be assigned to this placement, so the UI can offer a picker
     * instead of asking anyone to paste a UUID. This is a convenience, NOT the security boundary —
     * {@link SupervisorEligibility} re-validates the chosen id on the write path regardless of what
     * the browser sends (CLAUDE.md Phase 5 section 13).
     */
    @Transactional(readOnly = true)
    public List<EligibleSupervisor> listEligibleUniversitySupervisors(UUID actingUserId, UUID placementId) {
        Placement placement = authorization.requireUniversityManage(actingUserId, placementId);

        return universityMemberships.findByUniversityId(placement.getUniversityId()).stream()
                .filter(UniversityMembership::isActive)
                .filter(membership -> membership.getRole() == UniversityRole.UNIVERSITY_SUPERVISOR)
                .map(membership -> toEligible(membership.getUserId()))
                .flatMap(Optional::stream)
                .toList();
    }

    /** The organization supervisors who may be assigned to this placement. Same caveat as above. */
    @Transactional(readOnly = true)
    public List<EligibleSupervisor> listEligibleOrganizationSupervisors(UUID actingUserId, UUID placementId) {
        Placement placement = authorization.requireOrganizationManage(actingUserId, placementId);

        return organizationMemberships.findByOrganizationId(placement.getOrganizationId()).stream()
                .filter(OrganizationMembership::isActive)
                .filter(membership -> membership.getRole() == OrganizationRole.ORGANIZATION_SUPERVISOR)
                .map(membership -> toEligible(membership.getUserId()))
                .flatMap(Optional::stream)
                .toList();
    }

    private Optional<EligibleSupervisor> toEligible(UUID userId) {
        return users.findById(userId).map(user -> new EligibleSupervisor(userId, user.getDisplayName(), user.getEmail()));
    }
}
