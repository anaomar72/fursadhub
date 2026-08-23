package com.fursadhub.candidacy.domain;

/** Unified candidacy states — CLAUDE.md section 37. Do not add states without explicit approval. */
public enum CandidacyStatus {
    SUBMITTED,
    UNDER_REVIEW,
    SHORTLISTED,
    INTERVIEW,
    OFFERED,
    OFFER_DECLINED,
    OFFER_EXPIRED,
    ACCEPTED,
    REJECTED,
    WITHDRAWN
}
