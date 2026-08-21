package com.fursadhub.verification.domain;

/** Student university-enrollment verification states — CLAUDE.md section 30. Do not add states without explicit approval. */
public enum StudentVerificationStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    NEEDS_MORE_EVIDENCE,
    VERIFIED,
    REJECTED,
    REVOKED
}
