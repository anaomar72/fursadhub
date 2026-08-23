package com.fursadhub.candidacy.domain;

/** Nomination states — CLAUDE.md section 35. Do not add states without explicit approval. */
public enum NominationStatus {
    PENDING_STUDENT_CONSENT,
    ACCEPTED,
    DECLINED,
    WITHDRAWN
}
