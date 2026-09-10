package com.fursadhub.testimonial.domain;

/**
 * The whole moderation lifecycle, deliberately three states (CLAUDE.md section 75: no more domain
 * states than the feature actually needs).
 *
 * <p>SUBMITTED is the only state a submission can start in — an author cannot publish themselves.
 * PUBLISHED is the only state the public endpoint will serve. REJECTED is terminal for that row;
 * the author may submit a replacement, which keeps the moderator's original decision intact rather
 * than overwriting it.
 */
public enum TestimonialStatus {
    SUBMITTED,
    PUBLISHED,
    REJECTED;

    public boolean isLive() {
        return this == SUBMITTED || this == PUBLISHED;
    }
}
