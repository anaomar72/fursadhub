package com.fursadhub.compliance.domain;

/**
 * Optional processing a user may separately consent to (CLAUDE.md section 49).
 *
 * <p>Deliberately tiny, and deliberately NOT derived from terms acceptance. Accepting the Terms is a
 * contractual act; these are freely given and freely withdrawn, and withdrawing one has no effect on
 * the Terms. Nothing required to run an internship appears here — a student never has to consent to
 * anything in order to apply, be nominated, or complete a placement.
 */
public enum ConsentType {

    /** Product announcements and newsletters. Never used for transactional mail. */
    PRODUCT_UPDATE_EMAIL,

    /** Emails suggesting internships that may suit the student. */
    OPPORTUNITY_RECOMMENDATION_EMAIL
}
