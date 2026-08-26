package com.fursadhub.compliance.domain;

/** Data-subject request states — CLAUDE.md section 50. Frozen; also enforced by a CHECK constraint. */
public enum PrivacyRequestState {
    SUBMITTED,
    IN_REVIEW,
    COMPLETED,
    REJECTED;

    public boolean isTerminal() {
        return this == COMPLETED || this == REJECTED;
    }
}
