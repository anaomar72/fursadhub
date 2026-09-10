package com.fursadhub.administration;

import com.fursadhub.administration.application.PlatformAccountService;
import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformAdminRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.Locale;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

/**
 * Backend Phase B5.6 — provisioning is one transaction, proved from the database rather than from
 * the HTTP status.
 *
 * <p>The gap this closes: the sibling {@code PlatformVerificationOfficerIT} can force a duplicate
 * username or email, but it cannot make the ROLE GRANT fail. The grant is inserted after the user,
 * with a freshly generated user id, so its partial unique index
 * ({@code uk_platform_admins_active_role}) has nothing to collide with — no request this test could
 * send would reach that failure.
 *
 * <p>So the grant repository is stubbed to throw, which is the smallest injection that reproduces
 * the real shape: the user row is genuinely written to PostgreSQL, and then the next statement in
 * the same transaction fails. Nothing in production code is aware of this test — there is no failure
 * hook, no test profile branch, no flag.
 *
 * <p>Why it matters more here than for tenant staff: a half-provisioned PRIVILEGED account is
 * invisible. A user row with a working username and no role grant is not an error anyone sees; it is
 * a login that silently does nothing, sitting in the accounts list looking provisioned.
 */
class PlatformProvisioningAtomicityIT extends AbstractPhase7IT {

    @Autowired
    private PlatformAccountService accountService;

    /**
     * A SPY, not a mock: every read this service performs — {@code requireSuperAdmin}'s grant lookup
     * above all — must keep working, or the test would fail before reaching the point of interest.
     * Only {@code save} is stubbed.
     */
    @MockitoSpyBean
    private PlatformAdminRepository platformAdmins;

    @Test
    @DisplayName("A failure persisting the role grant rolls back the user that was already written")
    void aGrantFailureRollsBackTheUser() {
        Staff root = superAdmin("b56-atomic-grant");
        String username = "b56grantfail" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String email = uniqueEmail(emailPrefix("b56-atomic-grant-officer"));

        doThrow(new DataIntegrityViolationException("simulated grant persistence failure"))
                .when(platformAdmins).save(any(PlatformAdmin.class));

        // Called through the service, not HTTP: the assertion is about the transaction boundary, and
        // the response status would tell us nothing about whether the row survived.
        assertThatThrownBy(() -> accountService.createVerificationOfficer(
                root.userId(), "Rolled Back", username, email, "Password123", "Password123", null, null))
                .isInstanceOf(DataIntegrityViolationException.class);

        // The user INSERT had already been flushed to PostgreSQL when the grant failed. If the
        // rollback did not reach it, these would be 1 — a privileged account with no role and a
        // username nobody else can ever claim.
        assertThat(countUsersWithEmail(email)).as("orphaned user row").isZero();
        assertThat(countUsersWithUsername(username)).as("orphaned username").isZero();
        assertThat(countGrantsForEmail(email)).as("orphaned platform grant").isZero();
    }

    /**
     * The audit event is written by {@code AuditService} in a REQUIRES_NEW transaction, so it commits
     * independently of this one and a rollback cannot take it back. That makes its POSITION load
     * bearing: it is the last statement, after both inserts have actually hit the database, so a
     * failed provisioning leaves no audit record claiming an account was created.
     */
    @Test
    @DisplayName("A failed provisioning writes no PLATFORM_ACCOUNT_CREATED audit event")
    void aFailedProvisioningIsNotAudited() {
        Staff root = superAdmin("b56-atomic-audit");
        String username = "b56auditfail" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String email = uniqueEmail(emailPrefix("b56-atomic-audit-officer"));

        doThrow(new DataIntegrityViolationException("simulated grant persistence failure"))
                .when(platformAdmins).save(any(PlatformAdmin.class));

        assertThatThrownBy(() -> accountService.createVerificationOfficer(
                root.userId(), "Never Created", username, email, "Password123", "Password123", null, null))
                .isInstanceOf(DataIntegrityViolationException.class);

        Integer audited = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_events WHERE event_type = 'PLATFORM_ACCOUNT_CREATED'"
                        + " AND metadata LIKE ?",
                Integer.class, "%" + username + "%");
        assertThat(audited).isZero();
    }

    /**
     * The control: with the stub gone, the identical call succeeds and leaves all three rows. Without
     * this, both tests above would still pass if provisioning had simply stopped working.
     */
    @Test
    @DisplayName("A successful provisioning leaves the user, the username and the grant")
    void aSuccessfulProvisioningLeavesEverything() {
        Staff root = superAdmin("b56-atomic-success");
        String username = "b56grantok" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String email = uniqueEmail(emailPrefix("b56-atomic-success-officer"));

        accountService.createVerificationOfficer(
                root.userId(), "Fully Created", username, email, "Password123", "Password123", null, null);

        assertThat(countUsersWithEmail(email)).isOne();
        assertThat(countUsersWithUsername(username)).isOne();
        assertThat(countGrantsForEmail(email)).isOne();
    }

    private int countUsersWithEmail(String email) {
        return count("SELECT count(*) FROM users WHERE email = ?", email.toLowerCase(Locale.ROOT));
    }

    private int countUsersWithUsername(String username) {
        return count("SELECT count(*) FROM users WHERE username = ?", username);
    }

    private int countGrantsForEmail(String email) {
        return count(
                "SELECT count(*) FROM platform_admins p JOIN users u ON u.id = p.user_id"
                        + " WHERE u.email = ? AND p.revoked_at IS NULL",
                email.toLowerCase(Locale.ROOT));
    }

    private int count(String sql, Object argument) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class, argument);
        return value == null ? 0 : value;
    }
}
