package com.fursadhub.administration.application;

import com.fursadhub.common.api.ApiException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.SQLException;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Which integrity failure a platform provisioning race is reported as (Backend Phase B5.6).
 *
 * <p>Provisioning inserts one row carrying TWO unique identifiers, so this classification is the only
 * thing standing between the admin and a misleading message. An integration test cannot cover it: it
 * cannot make a foreign-key or CHECK violation happen at the exact instant of the flush, and it
 * cannot tell a loser rejected by the service's pre-check from one rejected by the constraint itself.
 * Every case here is deterministic.
 */
class PlatformAccountConstraintsTest {

    @Test
    void theEmailConstraintBecomesThePlatformEmailConflict() {
        ApiException translated = PlatformAccountConstraints.translate(
                violation(PlatformAccountConstraints.EMAIL_UNIQUE_CONSTRAINT));

        assertThat(translated.getCode()).isEqualTo("PLATFORM_ACCOUNT_EMAIL_ALREADY_EXISTS");
    }

    /**
     * The code must NOT be {@code STAFF_EMAIL_ALREADY_EXISTS}. That belongs to tenant-managed staff
     * creation, and a platform officer has no tenant — sharing it would make the two situations
     * indistinguishable to any client that routes on the code.
     */
    @Test
    void thePlatformEmailConflictIsNotTheTenantStaffCode() {
        assertThat(PlatformAccountConstraints.translate(
                violation(PlatformAccountConstraints.EMAIL_UNIQUE_CONSTRAINT)).getCode())
                .isNotEqualTo("STAFF_EMAIL_ALREADY_EXISTS");
    }

    @Test
    void theUsernameConstraintStillBecomesATakenUsername() {
        ApiException translated = PlatformAccountConstraints.translate(violation("uk_users_username"));

        assertThat(translated.getCode()).isEqualTo("USERNAME_ALREADY_EXISTS");
    }

    /** PostgreSQL folds identifiers, so the comparison must not depend on their case. */
    @Test
    void constraintNamesAreMatchedCaseInsensitively() {
        assertThat(PlatformAccountConstraints.translate(
                violation(PlatformAccountConstraints.EMAIL_UNIQUE_CONSTRAINT.toUpperCase(Locale.ROOT))).getCode())
                .isEqualTo("PLATFORM_ACCOUNT_EMAIL_ALREADY_EXISTS");
        assertThat(PlatformAccountConstraints.translate(violation("UK_USERS_USERNAME")).getCode())
                .isEqualTo("USERNAME_ALREADY_EXISTS");
    }

    /**
     * The two duplicate identifiers must not be confusable in either direction: an admin sent to fix
     * the wrong field will retry forever, changing something that was never the problem.
     */
    @Test
    void theTwoDuplicateIdentifiersAreNeverConfused() {
        assertThat(PlatformAccountConstraints.translate(violation("uk_users_email")).getCode())
                .isNotEqualTo(PlatformAccountConstraints.translate(violation("uk_users_username")).getCode());
    }

    @Test
    void anUnrelatedIntegrityViolationPropagates() {
        for (String constraint : new String[] {
                "fk_platform_admins_user", "ck_users_username_format", "uk_users_display_name"}) {
            DataIntegrityViolationException unrelated = violation(constraint);
            assertThatThrownBy(() -> PlatformAccountConstraints.translate(unrelated))
                    .as("%s must propagate", constraint)
                    .isSameAs(unrelated);
        }
    }

    /** With no constraint name there is nothing to identify, so the failure is not guessed at. */
    @Test
    void anUnnamedIntegrityViolationPropagates() {
        DataIntegrityViolationException unnamed = new DataIntegrityViolationException("no constraint name");

        assertThatThrownBy(() -> PlatformAccountConstraints.translate(unnamed)).isSameAs(unnamed);
    }

    /** Mirrors how Spring surfaces a PostgreSQL constraint failure: Hibernate's exception as cause. */
    private static DataIntegrityViolationException violation(String constraintName) {
        ConstraintViolationException hibernate = new ConstraintViolationException(
                "constraint violation", new SQLException("duplicate key", "23505"), constraintName);
        return new DataIntegrityViolationException("could not execute statement", hibernate);
    }
}
