package com.fursadhub.testimonial.domain;

/**
 * The author's REAL FursadHub role at the moment they submitted, one value per role in CLAUDE.md
 * section 23.
 *
 * <p>This is derived by the server from current PostgreSQL membership and platform-grant data and
 * then frozen into the testimonial row. It is never accepted from the browser: the submission
 * request has no role field at all, so a recruiter has no way to sign their quote "Student" and a
 * coordinator has no way to sign theirs "Recruiter at ...".
 *
 * <p>It is a PRESENTATION snapshot, not an authorization input. Nothing anywhere reads this value to
 * decide what someone may do — authorization always re-reads current membership (CLAUDE.md section
 * 24), and a stale role frozen in a two-year-old testimonial must never grant anything.
 */
public enum TestimonialAuthorRole {

    STUDENT(TestimonialAudience.STUDENT),

    ORGANIZATION_ADMIN(TestimonialAudience.ORGANIZATION),
    RECRUITER(TestimonialAudience.ORGANIZATION),
    ORGANIZATION_SUPERVISOR(TestimonialAudience.ORGANIZATION),

    UNIVERSITY_ADMIN(TestimonialAudience.UNIVERSITY),
    DEPARTMENT_COORDINATOR(TestimonialAudience.UNIVERSITY),
    UNIVERSITY_SUPERVISOR(TestimonialAudience.UNIVERSITY),

    /** FursadHub's own staff. Labelled as such publicly — never as a customer endorsement. */
    SUPER_ADMIN(TestimonialAudience.PLATFORM),
    VERIFICATION_OFFICER(TestimonialAudience.PLATFORM);

    private final TestimonialAudience audience;

    TestimonialAuthorRole(TestimonialAudience audience) {
        this.audience = audience;
    }

    /** The broad group this role speaks for. Stored beside the role so legacy rows stay comparable. */
    public TestimonialAudience audience() {
        return audience;
    }

    /**
     * True for FursadHub's own platform roles. A quote from one of these is the platform talking
     * about itself, so the public site labels it that way rather than letting it read as a
     * customer's endorsement.
     */
    public boolean isPlatformRole() {
        return audience == TestimonialAudience.PLATFORM;
    }
}
