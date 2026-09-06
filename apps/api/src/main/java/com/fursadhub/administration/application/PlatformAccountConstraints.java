package com.fursadhub.administration.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.ManagedUsernameAssignment;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

/**
 * Classifies the integrity failures a platform-account provisioning race can produce
 * (Backend Phase B5.6).
 *
 * <p>Provisioning inserts one row that carries TWO unique identifiers — email and username — so a
 * concurrent request can lose on either one, and both arrive as the same
 * {@code DataIntegrityViolationException} from the same statement. Telling them apart is the whole
 * job: an admin told "that username is taken" when the EMAIL was the duplicate will change the
 * username, retry, and fail again with the same message, learning nothing.
 *
 * <p>The username case delegates to {@link ManagedUsernameAssignment} rather than re-implementing it,
 * so the platform and institution paths cannot drift on which constraint counts as a taken username.
 *
 * <p>Anything else — a foreign key, a CHECK, an unnamed violation — is rethrown untouched. An
 * unexplained integrity error must surface as the defect it is, not be dressed up as a duplicate the
 * admin can act on.
 */
public final class PlatformAccountConstraints {

    /** Must match {@code uk_users_email} in V2. */
    public static final String EMAIL_UNIQUE_CONSTRAINT = "uk_users_email";

    private PlatformAccountConstraints() {
    }

    /**
     * Rethrows {@code violation} unless it is one of the two known duplicate-identity collisions.
     *
     * <p>Email is checked first and returns its own code. Deliberately NOT
     * {@code STAFF_EMAIL_ALREADY_EXISTS}: that code belongs to tenant-managed staff creation, and a
     * platform officer has no tenant. Sharing it would make the two situations indistinguishable to
     * any client that routes on the code — including the admin console, which shows a different form.
     */
    public static ApiException translate(DataIntegrityViolationException violation) {
        if (EMAIL_UNIQUE_CONSTRAINT.equalsIgnoreCase(constraintNameOf(violation))) {
            return new ApiException("PLATFORM_ACCOUNT_EMAIL_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "An account with this email already exists.");
        }
        // Rethrows anything that is not the username constraint, including a null constraint name.
        return ManagedUsernameAssignment.translate(violation);
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
