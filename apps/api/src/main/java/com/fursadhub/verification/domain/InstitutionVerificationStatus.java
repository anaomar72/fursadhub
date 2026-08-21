package com.fursadhub.verification.domain;

/** Institution (university/organization) verification states — CLAUDE.md section 31. Do not add states without explicit approval. */
public enum InstitutionVerificationStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    NEEDS_CHANGES,
    VERIFIED,
    REJECTED,
    SUSPENDED,
    REVOKED
}
