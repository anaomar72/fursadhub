package com.fursadhub.identity.domain;

import com.fursadhub.common.api.ApiException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Which integrity failures may be reported as a taken username (Backend Phase B5.5).
 *
 * <p>The concurrency test proves the RACE ends with one owner; this proves the CLASSIFICATION, which
 * a race test cannot: it cannot force a foreign-key or unrelated CHECK failure to occur at the right
 * instant, and it cannot distinguish a loser rejected by the service's pre-check from one rejected by
 * the constraint. Here every case is deterministic.
 *
 * <p>The rule being protected: reporting an unrelated integrity error as "that username is taken"
 * would send an admin to change a username that was never the problem, and would hide a real defect
 * behind a plausible message.
 */
class ManagedUsernameAssignmentTest {

    @Test
    void theUsernameUniqueConstraintBecomesAStableConflict() {
        ApiException translated = ManagedUsernameAssignment.translate(
                violation(ManagedUsernameAssignment.UNIQUE_CONSTRAINT));

        assertThat(translated.getCode()).isEqualTo("USERNAME_ALREADY_EXISTS");
    }

    /** PostgreSQL folds identifiers, so the comparison must not depend on their case. */
    @Test
    void theConstraintNameIsMatchedCaseInsensitively() {
        assertThat(ManagedUsernameAssignment.translate(
                violation(ManagedUsernameAssignment.UNIQUE_CONSTRAINT.toUpperCase(java.util.Locale.ROOT)))
                .getCode()).isEqualTo("USERNAME_ALREADY_EXISTS");
    }

    /**
     * A duplicate EMAIL is the most dangerous near-miss: it arrives as the same exception type from
     * the same insert, and mislabelling it would tell the admin the wrong field is wrong.
     */
    @Test
    void aDuplicateEmailIsNotReportedAsATakenUsername() {
        DataIntegrityViolationException emailCollision = violation("uk_users_email");

        assertThatThrownBy(() -> ManagedUsernameAssignment.translate(emailCollision))
                .isSameAs(emailCollision);
    }

    @Test
    void aForeignKeyOrCheckViolationPropagates() {
        for (String constraint : new String[] {"fk_some_reference", "ck_users_username_format", "ck_other_rule"}) {
            DataIntegrityViolationException unrelated = violation(constraint);
            assertThatThrownBy(() -> ManagedUsernameAssignment.translate(unrelated))
                    .as("%s must propagate", constraint)
                    .isSameAs(unrelated);
        }
    }

    /** With no constraint name there is nothing to identify, so the failure is not guessed at. */
    @Test
    void anUnnamedIntegrityViolationPropagates() {
        DataIntegrityViolationException unnamed = new DataIntegrityViolationException("no constraint name");

        assertThatThrownBy(() -> ManagedUsernameAssignment.translate(unnamed)).isSameAs(unnamed);
    }

    /** Mirrors how Spring surfaces a PostgreSQL constraint failure: Hibernate's exception as cause. */
    private static DataIntegrityViolationException violation(String constraintName) {
        ConstraintViolationException hibernate = new ConstraintViolationException(
                "constraint violation", new SQLException("duplicate key", "23505"), constraintName);
        return new DataIntegrityViolationException("could not execute statement", hibernate);
    }
}
