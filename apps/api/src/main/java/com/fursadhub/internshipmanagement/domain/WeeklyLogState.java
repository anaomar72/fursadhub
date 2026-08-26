package com.fursadhub.internshipmanagement.domain;

/** Frozen weekly-log states (CLAUDE.md section 42). Do not extend without explicit approval. */
public enum WeeklyLogState {
    DRAFT,
    SUBMITTED,
    RETURNED_FOR_CHANGES,
    REVIEWED
}
