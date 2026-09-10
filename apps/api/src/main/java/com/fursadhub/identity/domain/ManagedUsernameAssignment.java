package com.fursadhub.identity.domain;

import com.fursadhub.common.api.ApiException;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

/**
 * Turns a username uniqueness collision into a stable error (Backend Phase B5.5).
 *
 * <p>Shared by the organization and university staff services so both report the same code for the
 * same situation, and — more importantly — so both classify the failure the same way.
 *
 * <p><strong>Only the known username constraint becomes {@code USERNAME_ALREADY_EXISTS}.</strong>
 * {@code DataIntegrityViolationException} is a wide net: a duplicate EMAIL, a foreign-key failure or
 * any future CHECK arrives as the same type. Reporting all of them as "that username is taken" would
 * send an admin to change a username that was never the problem — and would hide a real defect
 * behind a plausible message. Anything else is rethrown untouched.
 *
 * <p>This is the B4 lesson applied deliberately rather than rediscovered: a race is only "handled"
 * when the handler knows which race it caught.
 */
public final class ManagedUsernameAssignment {

    /** Must match {@code uk_users_username} in V46. */
    public static final String UNIQUE_CONSTRAINT = "uk_users_username";

    private ManagedUsernameAssignment() {
    }

    /**
     * Rethrows {@code violation} unless it is specifically the username-uniqueness collision, in
     * which case it becomes a {@code 409 USERNAME_ALREADY_EXISTS}.
     *
     * <p>Identified by the constraint name PostgreSQL reports through Hibernate's
     * {@code ConstraintViolationException}. If no name is available the failure is rethrown rather
     * than guessed at — an unexplained integrity error must not be presented as a taken username.
     */
    public static ApiException translate(DataIntegrityViolationException violation) {
        if (UNIQUE_CONSTRAINT.equalsIgnoreCase(constraintNameOf(violation))) {
            return new ApiException("USERNAME_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "That username is already taken.");
        }
        throw violation;
    }

    private static String constraintNameOf(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraintViolation) {
                return constraintViolation.getConstraintName();
            }
            if (cause.getCause() == cause) {
                break;
            }
        }
        return null;
    }
}
