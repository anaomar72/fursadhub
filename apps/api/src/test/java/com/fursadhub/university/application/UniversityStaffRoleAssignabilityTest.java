package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.application.LogoutService;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.infrastructure.TemporaryPasswordGenerator;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Fast, Spring-context-free coverage of the university staff role-assignability allowlist
 * (CLAUDE.md section 23): a University Admin may only provision {@code DEPARTMENT_COORDINATOR}
 * or {@code UNIVERSITY_SUPERVISOR} accounts — never {@code UNIVERSITY_ADMIN}, whether at creation
 * or on a later role change.
 */
class UniversityStaffRoleAssignabilityTest {

    private final UniversityAuthorization authorization = mock(UniversityAuthorization.class);
    private final UniversityMembershipRepository memberships = mock(UniversityMembershipRepository.class);
    private final UniversityMembershipDepartmentRepository membershipDepartments = mock(UniversityMembershipDepartmentRepository.class);
    private final DepartmentRepository departments = mock(DepartmentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final LogoutService logoutService = mock(LogoutService.class);
    private final TemporaryPasswordGenerator temporaryPasswordGenerator = mock(TemporaryPasswordGenerator.class);
    private final AuditService audit = mock(AuditService.class);

    private final UniversityStaffService service = new UniversityStaffService(
            authorization, memberships, membershipDepartments, departments, users,
            passwordEncoder, logoutService, temporaryPasswordGenerator, audit);

    @Test
    void createRejectsUniversityAdminRole() {
        assertThatThrownBy(() -> service.create(
                UUID.randomUUID(), UUID.randomUUID(), "new-admin@example.test", "Password123", "Password123",
                null, "newadmin", UniversityRole.UNIVERSITY_ADMIN, List.of(), "127.0.0.1", "test"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    void changeRoleRejectsUniversityAdminRole() {
        assertThatThrownBy(() -> service.changeRole(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UniversityRole.UNIVERSITY_ADMIN,
                List.of(), "127.0.0.1", "test"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @ParameterizedTest
    @EnumSource(value = UniversityRole.class, names = {"DEPARTMENT_COORDINATOR", "UNIVERSITY_SUPERVISOR"})
    void createAcceptsEveryAssignableRole(UniversityRole role) {
        UUID universityId = UUID.randomUUID();
        UUID departmentId = UUID.randomUUID();
        when(users.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(departments.existsByIdAndUniversityId(departmentId, universityId)).thenReturn(true);

        UniversityStaffService.StaffMember created = service.create(
                UUID.randomUUID(), universityId, "new-staff@example.test", "Password123", "Password123",
                null, "newstaff", role, List.of(departmentId), "127.0.0.1", "test");

        assertThat(created.membership().getRole()).isEqualTo(role);
    }
}
