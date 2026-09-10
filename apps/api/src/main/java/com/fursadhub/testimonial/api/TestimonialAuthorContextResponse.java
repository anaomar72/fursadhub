package com.fursadhub.testimonial.api;

import com.fursadhub.testimonial.domain.TestimonialAuthorContext;

/**
 * How the signed-in caller would be attributed if they submitted a testimonial right now.
 *
 * <p>Read-only, and its whole purpose is to let the form SHOW someone their role instead of asking
 * for it: "You are sharing as: Recruiter · Acme Ltd". The browser can display this and nothing more
 * — the value written to the row is resolved again server-side at submission, so tampering with the
 * response changes what one person sees on their own screen and nothing that is published.
 *
 * <p>{@code eligible} is false when the account holds no attributable role. The frontend uses it to
 * explain why the form is unavailable rather than to enforce anything; the submission endpoint
 * refuses the same case with {@code TESTIMONIAL_ROLE_NOT_ELIGIBLE} regardless.
 *
 * <p>No tenant id, and no membership id. The name snapshot is all the form needs to render.
 */
public record TestimonialAuthorContextResponse(
        boolean eligible,
        String authorRole,
        String authorAudience,
        String authorAffiliation) {

    public static TestimonialAuthorContextResponse from(TestimonialAuthorContext context) {
        return new TestimonialAuthorContextResponse(true, context.role().name(),
                context.audience().name(), context.tenantDisplayName());
    }

    public static TestimonialAuthorContextResponse ineligible() {
        return new TestimonialAuthorContextResponse(false, null, null, null);
    }
}
