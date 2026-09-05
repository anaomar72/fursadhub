package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.application.LogoutService;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.infrastructure.TemporaryPasswordGenerator;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Fast, Spring-context-free coverage of the organization staff role-assignability allowlist
 * (CLAUDE.md section 23): an Organization Admin may only provision {@code RECRUITER} or
 * {@code ORGANIZATION_SUPERVISOR} accounts — never {@code ORGANIZATION_ADMIN}, whether at
 * creation or on a later role change.
 */
class OrganizationStaffRoleAssignabilityTest {

    private final OrganizationAuthorization authorization = mock(OrganizationAuthorization.class);
    private final OrganizationMembershipRepository memberships = mock(OrganizationMembershipRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final LogoutService logoutService = mock(LogoutService.class);
    private final TemporaryPasswordGenerator temporaryPasswordGenerator = mock(TemporaryPasswordGenerator.class);
    private final AuditService audit = mock(AuditService.class);

    private final OrganizationMembershipService service = new OrganizationMembershipService(
            authorization, memberships, users, passwordEncoder,
            logoutService, temporaryPasswordGenerator, audit);

    @Test
    void createRejectsOrganizationAdminRole() {
        assertThatThrownBy(() -> service.create(
                UUID.randomUUID(), UUID.randomUUID(), "new-admin@example.test", "Password123", "Password123",
                null, OrganizationRole.ORGANIZATION_ADMIN, "127.0.0.1", "test"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    void changeRoleRejectsOrganizationAdminRole() {
        assertThatThrownBy(() -> service.changeRole(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), OrganizationRole.ORGANIZATION_ADMIN,
                "127.0.0.1", "test"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @ParameterizedTest
    @EnumSource(value = OrganizationRole.class, names = {"RECRUITER", "ORGANIZATION_SUPERVISOR"})
    void createAcceptsEveryAssignableRole(OrganizationRole role) {
        when(users.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed");

        OrganizationMembershipService.Member created = service.create(
                UUID.randomUUID(), UUID.randomUUID(), "new-staff@example.test", "Password123", "Password123",
                null, role, "127.0.0.1", "test");

        assertThat(created.membership().getRole()).isEqualTo(role);
    }
}
