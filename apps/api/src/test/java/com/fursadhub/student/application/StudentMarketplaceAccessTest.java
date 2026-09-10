package com.fursadhub.student.application;

import com.fursadhub.administration.domain.*;
import com.fursadhub.organization.domain.*;
import com.fursadhub.university.domain.*;
import com.fursadhub.student.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudentMarketplaceAccessTest {
    private final UUID user = UUID.randomUUID();
    private final StudentProfileRepository profiles = mock(StudentProfileRepository.class);
    private final StudentEnrollmentRepository enrollments = mock(StudentEnrollmentRepository.class);
    private final OrganizationMembershipRepository organizations = mock(OrganizationMembershipRepository.class);
    private final UniversityMembershipRepository universities = mock(UniversityMembershipRepository.class);
    private final PlatformAdminRepository platform = mock(PlatformAdminRepository.class);
    private final StudentMarketplaceAccess access =
            new StudentMarketplaceAccess(profiles, enrollments, organizations, universities, platform);

    @BeforeEach void student() {
        when(profiles.findByUserId(user)).thenReturn(Optional.of(StudentProfile.create(user, "Student", null)));
    }

    @Test void studentWithNoStaffMembershipCanAct() {
        assertThat(access.canAct(user)).isTrue();
        assertThatCode(() -> access.requireStudent(user)).doesNotThrowAnyException();
    }

    @Test void neitherProfileNorEnrollmentCannotAct() {
        when(profiles.findByUserId(user)).thenReturn(Optional.empty());
        when(enrollments.existsByStudentUserId(user)).thenReturn(false);
        denied();
    }

    /**
     * Regression. The student profile is OPTIONAL — {@code StudentEnrollmentService} never creates
     * or requires one — so a student can enrol and reach VERIFIED without ever filling it in.
     * Keying student-ness on the profile alone answered a verified student with
     * "Only students can apply for or save internships" and hid Apply/Save from them entirely.
     */
    @Test void enrolledStudentWithoutAProfileCanStillAct() {
        when(profiles.findByUserId(user)).thenReturn(Optional.empty());
        when(enrollments.existsByStudentUserId(user)).thenReturn(true);
        assertThat(access.canAct(user)).isTrue();
        assertThatCode(() -> access.requireStudent(user)).doesNotThrowAnyException();
    }

    /** An enrollment record does not buy a staff account marketplace access either. */
    @Test void staffWithAnEnrollmentIsStillDenied() {
        when(profiles.findByUserId(user)).thenReturn(Optional.empty());
        when(enrollments.existsByStudentUserId(user)).thenReturn(true);
        when(organizations.findActiveByUserId(user)).thenReturn(
                List.of(OrganizationMembership.assign(UUID.randomUUID(), user, OrganizationRole.RECRUITER)));
        denied();
    }

    @ParameterizedTest @EnumSource(OrganizationRole.class)
    void everyOrganizationRoleIsDeniedEvenWithStudentProfile(OrganizationRole role) {
        when(organizations.findActiveByUserId(user)).thenReturn(List.of(OrganizationMembership.assign(UUID.randomUUID(), user, role)));
        denied();
    }

    @ParameterizedTest @EnumSource(UniversityRole.class)
    void everyUniversityRoleIsDeniedEvenWithStudentProfile(UniversityRole role) {
        when(universities.findActiveByUserId(user)).thenReturn(Optional.of(UniversityMembership.assign(UUID.randomUUID(), user, role)));
        denied();
    }

    @ParameterizedTest @EnumSource(PlatformRole.class)
    void everyPlatformRoleIsDeniedEvenWithStudentProfile(PlatformRole role) {
        when(platform.findActiveByUserId(user)).thenReturn(List.of(PlatformAdmin.grant(user, role, null)));
        denied();
    }

    private void denied() {
        assertThat(access.canAct(user)).isFalse();
        assertThatThrownBy(() -> access.requireStudent(user)).hasMessage("Only students can apply for or save internships.");
    }
}
