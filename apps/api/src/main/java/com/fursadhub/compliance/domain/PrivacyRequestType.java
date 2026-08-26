package com.fursadhub.compliance.domain;

/** Data-subject request types — CLAUDE.md section 50. Frozen; also enforced by a CHECK constraint. */
public enum PrivacyRequestType {
    ACCESS,
    CORRECTION,
    ERASURE,
    RESTRICTION,
    PORTABILITY,
    OBJECTION
}
