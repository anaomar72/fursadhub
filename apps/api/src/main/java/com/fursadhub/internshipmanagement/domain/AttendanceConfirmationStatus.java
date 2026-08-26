package com.fursadhub.internshipmanagement.domain;

/**
 * Frozen attendance confirmation states (CLAUDE.md section 43).
 *
 * <p>RECORDED and DISPUTED are UNSETTLED — someone still has to act on them. CONFIRMED and RESOLVED
 * are settled. That split is the whole attendance completion rule, so it lives here rather than
 * being re-derived at each call site.
 */
public enum AttendanceConfirmationStatus {
    RECORDED,
    CONFIRMED,
    DISPUTED,
    RESOLVED;

    public boolean isSettled() {
        return this == CONFIRMED || this == RESOLVED;
    }
}
