package com.fursadhub.file.domain;

/**
 * Why a document is kept, and therefore how long (CLAUDE.md sections 47, 49).
 *
 * <p>This is METADATA. FursadHub records what each document is retained for; it does not delete
 * anything on a timer. That is deliberate: an automated purge is a data-retention WORKFLOW, and one
 * running unattended would happily destroy a student's evidence in the middle of an open
 * verification case or a disputed placement. Erasure happens through a reviewed privacy request
 * (CLAUDE.md section 50), where a human can see what else depends on the document.
 */
public enum RetentionCategory {

    /**
     * Documents belonging to the student's own profile, such as a CV. Retained while the account
     * exists; the student may replace or remove them at any time.
     */
    STUDENT_RECORD,

    /**
     * Evidence gathered to verify an enrollment claim. Retained while the verification case is
     * meaningful — a verification that cannot be re-examined later is not much of a verification.
     */
    VERIFICATION_EVIDENCE,

    /**
     * Academic output such as the final internship report. Retained with the placement it belongs
     * to, because it is part of the university's record of a completed internship.
     */
    ACADEMIC_RECORD,

    /**
     * A personal profile picture or an organization's/university's own logo — identity the account
     * or tenant presents to others, not evidence gathered to prove a claim. Retained while the
     * account/tenant exists; replaceable at any time by whoever owns it.
     */
    ACCOUNT_ASSET
}
