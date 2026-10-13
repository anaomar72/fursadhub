package com.fursadhub.administration.domain;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;

/**
 * The fixed platform permission catalog (Phase C1). Every entry names a backend capability that
 * exists — or, for {@link Availability#RESERVED} entries, one that has been approved but not built —
 * and the stable {@link #name()} is what PostgreSQL stores.
 *
 * <p><strong>Two independent properties per entry.</strong>
 *
 * <ul>
 *   <li>{@link Availability}: whether the capability exists in the backend today. A RESERVED
 *       permission is never granted by the resolver and cannot be stored in a grant table — the
 *       migration's CHECK constraints admit only {@link #grantableCodes()}.</li>
 *   <li>{@link Assignability}: whether it may be handed to anyone other than a Super Admin.
 *       {@link Assignability#SUPER_ADMIN_ONLY} entries (revocation and reinstatement, D-5, and
 *       legal-document publication, during the pilot) are held only by {@code SUPER_ADMIN} and can never appear in a custom
 *       role or a direct grant.</li>
 * </ul>
 *
 * <p>Root operations — granting or revoking system roles, managing platform staff and custom roles —
 * are deliberately NOT in this catalog: see {@link PlatformRootCapability}. Keeping them out of the
 * enum is what makes it impossible for a checkbox UI built on this catalog to ever offer them.
 *
 * <p>Adding an entry requires a Flyway migration that widens the CHECK constraints, and
 * {@code PlatformRbacFoundationIT} fails if the two ever disagree.
 */
public enum PlatformPermission {

    // ---------------------------------------------------------------- institution verification

    /** List/read organizations and universities in the review queues, and open their evidence. */
    INSTITUTION_REVIEW_READ(PlatformPermissionCategory.INSTITUTION_VERIFICATION, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** Begin review, request changes, verify or reject an institution. */
    INSTITUTION_REVIEW_DECIDE(PlatformPermissionCategory.INSTITUTION_VERIFICATION, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** Suspend a verified institution. Explicit grant only — not part of the Verification Officer role (D-5). */
    INSTITUTION_SUSPEND(PlatformPermissionCategory.INSTITUTION_VERIFICATION, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** Revoke an institution's verification. Super Admin only during the pilot (D-5). */
    INSTITUTION_REVOKE(PlatformPermissionCategory.INSTITUTION_VERIFICATION, Availability.AVAILABLE, Assignability.SUPER_ADMIN_ONLY),
    /** Reinstate a suspended or revoked institution. Approved (Phase D); not built yet. */
    INSTITUTION_REINSTATE(PlatformPermissionCategory.INSTITUTION_VERIFICATION, Availability.RESERVED, Assignability.SUPER_ADMIN_ONLY),

    // ---------------------------------------------------------------- student verification

    /** Read and resolve escalated student-verification cases, including their evidence. */
    STUDENT_ESCALATION_REVIEW(PlatformPermissionCategory.STUDENT_VERIFICATION, Availability.AVAILABLE, Assignability.ASSIGNABLE),

    // ---------------------------------------------------------------- accounts

    /** Search and read user accounts. */
    USER_ACCOUNT_READ(PlatformPermissionCategory.ACCOUNTS, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** Suspend an account. Never applicable to platform staff accounts unless the actor is Super Admin. */
    USER_ACCOUNT_SUSPEND(PlatformPermissionCategory.ACCOUNTS, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** Reactivate a suspended account. Same platform-staff restriction as suspension. */
    USER_ACCOUNT_REACTIVATE(PlatformPermissionCategory.ACCOUNTS, Availability.AVAILABLE, Assignability.ASSIGNABLE),

    // ---------------------------------------------------------------- oversight

    /** Search and read the append-only audit trail. */
    AUDIT_READ(PlatformPermissionCategory.OVERSIGHT, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** Read platform-wide statistics. */
    PLATFORM_STATISTICS_READ(PlatformPermissionCategory.OVERSIGHT, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** Read every opportunity in any state (read-only oversight). */
    OPPORTUNITY_OVERSIGHT_READ(PlatformPermissionCategory.OVERSIGHT, Availability.AVAILABLE, Assignability.ASSIGNABLE),

    // ---------------------------------------------------------------- compliance

    /** Work the data-subject (privacy) request queue. */
    PRIVACY_REQUEST_PROCESS(PlatformPermissionCategory.COMPLIANCE, Availability.AVAILABLE, Assignability.ASSIGNABLE),
    /** List and publish versioned legal documents. Super Admin only during the pilot. */
    LEGAL_DOCUMENT_PUBLISH(PlatformPermissionCategory.COMPLIANCE, Availability.AVAILABLE, Assignability.SUPER_ADMIN_ONLY),

    // ---------------------------------------------------------------- content

    /** Moderate testimonials: queue, publish, unpublish, reject. */
    TESTIMONIAL_MODERATE(PlatformPermissionCategory.CONTENT, Availability.AVAILABLE, Assignability.ASSIGNABLE),

    // ---------------------------------------------------------------- support

    /** Handle support and recovery requests. Approved (Phase E); not built yet. */
    SUPPORT_REQUEST_HANDLE(PlatformPermissionCategory.SUPPORT, Availability.RESERVED, Assignability.ASSIGNABLE);

    /** Whether the backend capability exists today. */
    public enum Availability {
        AVAILABLE,
        RESERVED
    }

    /** Who may hold the permission. */
    public enum Assignability {
        /** May be placed in a custom role or granted directly to dedicated platform staff. */
        ASSIGNABLE,
        /** Held only by SUPER_ADMIN; never stored in a custom role or direct grant. */
        SUPER_ADMIN_ONLY
    }

    private final PlatformPermissionCategory category;
    private final Availability availability;
    private final Assignability assignability;

    PlatformPermission(PlatformPermissionCategory category, Availability availability, Assignability assignability) {
        this.category = category;
        this.availability = availability;
        this.assignability = assignability;
    }

    public PlatformPermissionCategory category() {
        return category;
    }

    public Availability availability() {
        return availability;
    }

    public Assignability assignability() {
        return assignability;
    }

    public boolean isAvailable() {
        return availability == Availability.AVAILABLE;
    }

    /**
     * May this permission be stored in a custom role or a direct grant? Only an AVAILABLE, ASSIGNABLE
     * permission — a reserved capability cannot be granted before it exists, and a Super-Admin-only
     * one cannot be granted at all.
     */
    public boolean isGrantable() {
        return isAvailable() && assignability == Assignability.ASSIGNABLE;
    }

    /** The codes PostgreSQL accepts in grant tables; must equal the V53 CHECK constraint lists. */
    public static Set<PlatformPermission> grantable() {
        EnumSet<PlatformPermission> result = EnumSet.noneOf(PlatformPermission.class);
        Arrays.stream(values()).filter(PlatformPermission::isGrantable).forEach(result::add);
        return result;
    }

    /** Every AVAILABLE permission — what a Super Admin effectively holds. */
    public static Set<PlatformPermission> available() {
        EnumSet<PlatformPermission> result = EnumSet.noneOf(PlatformPermission.class);
        Arrays.stream(values()).filter(PlatformPermission::isAvailable).forEach(result::add);
        return result;
    }
}
