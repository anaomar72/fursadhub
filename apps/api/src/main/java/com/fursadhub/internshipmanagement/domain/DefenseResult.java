package com.fursadhub.internshipmanagement.domain;

/**
 * Frozen defense results (CLAUDE.md section 46).
 *
 * <p>Only PASSED satisfies the completion requirement. FAILED and RETAKE_REQUIRED both leave the
 * requirement unmet; the difference between them is what the university does next, not what
 * FursadHub allows.
 */
public enum DefenseResult {
    PASSED,
    FAILED,
    RETAKE_REQUIRED;

    public boolean isSuccessful() {
        return this == PASSED;
    }
}
