package com.fursadhub.identity.domain;

/** Account states — CLAUDE.md section 22. Do not add states without explicit approval. */
public enum UserStatus {
    PENDING_CONTACT_VERIFICATION,
    ACTIVE,
    SUSPENDED,
    CLOSED
}
