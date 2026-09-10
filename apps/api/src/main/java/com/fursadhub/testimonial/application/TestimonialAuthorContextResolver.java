package com.fursadhub.testimonial.application;

import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformRole;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.student.domain.StudentProfileRepository;
import com.fursadhub.testimonial.domain.TestimonialAuthorContext;
import com.fursadhub.testimonial.domain.TestimonialAuthorRole;
import com.fursadhub.testimonial.domain.TestimonialTenantType;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.verification.domain.StudentVerificationStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Works out who an author actually is, from current PostgreSQL data about the authenticated caller.
 *
 * <p>This class exists because the previous design let the SUBMITTER choose their own role and type
 * their own affiliation, which meant a recruiter could publish a quote signed "Student · Jamhuriya
 * University". Nothing here reads the request body. The submission endpoint no longer carries a role
 * field at all, so there is no value to spoof rather than a value that is checked.
 *
 * <p><b>Precedence.</b> A person can genuinely hold more than one context — a super admin who is
 * also enrolled somewhere, or a coordinator who also recruits. Exactly one attribution can be
 * printed beside a quote, so the order is fixed and deliberate:
 *
 * <ol>
 *   <li><b>Platform staff first.</b> FursadHub's own people must never appear as a customer
 *       endorsement. If someone holds an active platform grant, that is what the public sees, even
 *       when they are also a student or staff somewhere. SUPER_ADMIN outranks VERIFICATION_OFFICER
 *       when both are held.</li>
 *   <li><b>University staff</b>, then <b>organization staff</b>. Both are institutional voices; the
 *       order between them is arbitrary but must be deterministic, so a second submission by the
 *       same person cannot silently change their label.</li>
 *   <li><b>Student</b> last, since a student who is also staff is speaking with the staff hat on.</li>
 * </ol>
 *
 * <p><b>Fail closed</b> (CLAUDE.md section 26A). A caller with no student profile and no membership
 * of any kind has no role to attribute, and gets a stable {@code TESTIMONIAL_ROLE_NOT_ELIGIBLE}
 * rather than a guessed default. There is deliberately no fallback to STUDENT: silently labelling an
 * unknown account as a student is precisely the misattribution this class was written to prevent.
 */
@Component
public class TestimonialAuthorContextResolver {

    private final PlatformAuthorization platformAuthorization;
    private final UniversityMembershipRepository universityMemberships;
    private final UniversityRepository universities;
    private final OrganizationMembershipRepository organizationMemberships;
    private final OrganizationRepository organizations;
    private final StudentProfileRepository studentProfiles;
    private final StudentEnrollmentRepository studentEnrollments;

    public TestimonialAuthorContextResolver(
            PlatformAuthorization platformAuthorization,
            UniversityMembershipRepository universityMemberships,
            UniversityRepository universities,
            OrganizationMembershipRepository organizationMemberships,
            OrganizationRepository organizations,
            StudentProfileRepository studentProfiles,
            StudentEnrollmentRepository studentEnrollments) {
        this.platformAuthorization = platformAuthorization;
        this.universityMemberships = universityMemberships;
        this.universities = universities;
        this.organizationMemberships = organizationMemberships;
        this.organizations = organizations;
        this.studentProfiles = studentProfiles;
        this.studentEnrollments = studentEnrollments;
    }

    /** The caller's context, or empty when they hold no role FursadHub can attribute a quote to. */
    @Transactional(readOnly = true)
    public Optional<TestimonialAuthorContext> resolve(UUID userId) {
        Optional<TestimonialAuthorContext> platform = platformContext(userId);
        if (platform.isPresent()) {
            return platform;
        }
        Optional<TestimonialAuthorContext> university = universityContext(userId);
        if (university.isPresent()) {
            return university;
        }
        Optional<TestimonialAuthorContext> organization = organizationContext(userId);
        if (organization.isPresent()) {
            return organization;
        }
        return studentContext(userId);
    }

    /** The same lookup, refusing rather than returning empty. Used by the submission path. */
    @Transactional(readOnly = true)
    public TestimonialAuthorContext require(UUID userId) {
        return resolve(userId).orElseThrow(() -> new ApiException(
                "TESTIMONIAL_ROLE_NOT_ELIGIBLE", HttpStatus.FORBIDDEN,
                "Your account does not yet have a FursadHub role we can attribute a story to."));
    }

    // ---------------------------------------------------------------- platform

    private Optional<TestimonialAuthorContext> platformContext(UUID userId) {
        // activeGrantsOf already refuses a suspended account, so a suspended super admin does not
        // keep the platform label — they simply fall through to whatever else they legitimately are.
        List<PlatformAdmin> grants = platformAuthorization.activeGrantsOf(userId);
        if (grants.isEmpty() || !platformAuthorization.isPlatformAdmin(userId)) {
            return Optional.empty();
        }
        boolean superAdmin = grants.stream().anyMatch(grant -> grant.getRole() == PlatformRole.SUPER_ADMIN);
        TestimonialAuthorRole role = superAdmin
                ? TestimonialAuthorRole.SUPER_ADMIN
                : TestimonialAuthorRole.VERIFICATION_OFFICER;
        // No tenant: a platform role is scoped to FursadHub itself, and the public card says so in
        // its own words rather than borrowing an institution name.
        return Optional.of(TestimonialAuthorContext.untenanted(role));
    }

    // ---------------------------------------------------------------- university

    private Optional<TestimonialAuthorContext> universityContext(UUID userId) {
        return universityMemberships.findActiveByUserId(userId).map(membership -> {
            TestimonialAuthorRole role = switch (membership.getRole()) {
                case UNIVERSITY_ADMIN -> TestimonialAuthorRole.UNIVERSITY_ADMIN;
                case DEPARTMENT_COORDINATOR -> TestimonialAuthorRole.DEPARTMENT_COORDINATOR;
                case UNIVERSITY_SUPERVISOR -> TestimonialAuthorRole.UNIVERSITY_SUPERVISOR;
            };
            return TestimonialAuthorContext.of(role, TestimonialTenantType.UNIVERSITY,
                    membership.getUniversityId(), universityName(membership));
        });
    }

    private String universityName(UniversityMembership membership) {
        return universities.findById(membership.getUniversityId())
                .map(university -> university.getName())
                .orElse(null);
    }

    // ---------------------------------------------------------------- organization

    private Optional<TestimonialAuthorContext> organizationContext(UUID userId) {
        // A user may staff more than one organization. Longest-standing membership wins, so the
        // label is stable across submissions instead of following whatever order the query returned.
        return organizationMemberships.findActiveByUserId(userId).stream()
                .min(Comparator.comparing(OrganizationMembership::getAssignedAt)
                        .thenComparing(OrganizationMembership::getId))
                .map(membership -> {
                    TestimonialAuthorRole role = switch (membership.getRole()) {
                        case ORGANIZATION_ADMIN -> TestimonialAuthorRole.ORGANIZATION_ADMIN;
                        case RECRUITER -> TestimonialAuthorRole.RECRUITER;
                        case ORGANIZATION_SUPERVISOR -> TestimonialAuthorRole.ORGANIZATION_SUPERVISOR;
                    };
                    return TestimonialAuthorContext.of(role, TestimonialTenantType.ORGANIZATION,
                            membership.getOrganizationId(), organizationName(membership));
                });
    }

    private String organizationName(OrganizationMembership membership) {
        return organizations.findById(membership.getOrganizationId())
                .map(Organization::getName)
                .orElse(null);
    }

    // ---------------------------------------------------------------- student

    /**
     * A student, with their university named only when the enrollment behind that claim is actually
     * VERIFIED.
     *
     * <p>An unverified or rejected enrollment is a claim FursadHub has not confirmed, and printing
     * "Student · Jamhuriya University" on the public home page would turn that unconfirmed claim
     * into a platform statement about a real institution. Those authors are still eligible — they
     * simply appear as "Student", with no institution attached.
     */
    private Optional<TestimonialAuthorContext> studentContext(UUID userId) {
        if (studentProfiles.findByUserId(userId).isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(studentEnrollments.findByStudentUserId(userId)
                .filter(enrollment -> enrollment.getVerificationStatus() == StudentVerificationStatus.VERIFIED)
                .map(this::verifiedStudentContext)
                .orElseGet(() -> TestimonialAuthorContext.untenanted(TestimonialAuthorRole.STUDENT)));
    }

    private TestimonialAuthorContext verifiedStudentContext(StudentEnrollment enrollment) {
        String name = universities.findById(enrollment.getUniversityId())
                .map(university -> university.getName())
                .orElse(null);
        return TestimonialAuthorContext.of(TestimonialAuthorRole.STUDENT, TestimonialTenantType.UNIVERSITY,
                enrollment.getUniversityId(), name);
    }
}
