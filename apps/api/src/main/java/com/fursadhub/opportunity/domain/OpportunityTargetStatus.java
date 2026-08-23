package com.fursadhub.opportunity.domain;

/** Opportunity target (per-university) states — CLAUDE.md section 34. Do not add states without explicit approval. */
public enum OpportunityTargetStatus {
    REQUESTED,
    ACKNOWLEDGED,
    NOMINATING,
    COMPLETED,
    DECLINED,
    EXPIRED
}
