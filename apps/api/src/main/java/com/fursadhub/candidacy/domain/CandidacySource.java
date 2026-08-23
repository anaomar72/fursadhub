package com.fursadhub.candidacy.domain;

/**
 * How a student entered the pipeline for an opportunity — CLAUDE.md section 36. There is exactly
 * one candidacy per (opportunity, student); when a student both self-applies and is nominated the
 * source merges to {@link #BOTH} rather than a second candidacy being created.
 */
public enum CandidacySource {
    SELF_APPLICATION,
    UNIVERSITY_NOMINATION,
    BOTH;

    /** Folds an additional entry route into this one, which is what makes the merge idempotent. */
    public CandidacySource merge(CandidacySource incoming) {
        if (this == incoming) {
            return this;
        }
        return BOTH;
    }
}
