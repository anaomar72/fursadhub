package com.fursadhub.testimonial.api;

import com.fursadhub.testimonial.domain.Testimonial;

/**
 * What an anonymous visitor sees.
 *
 * <p>Deliberately narrower than {@link TestimonialResponse}: no author user id, no status, no
 * moderator, no moderation note, no submission timestamp, and no tenant id. Only the quote and the
 * attribution FursadHub is prepared to state publicly.
 *
 * <p>{@code authorRole} is the server-derived role snapshot — {@code RECRUITER},
 * {@code DEPARTMENT_COORDINATOR}, {@code SUPER_ADMIN} and so on — so the card can say what someone
 * actually is. It is null for testimonials written before roles were derived, and
 * {@code authorAudience} (always present) is what the card falls back to for those. Both are enum
 * NAMES rather than English sentences, so the frontend translates them into English or Somali
 * instead of parsing prose (CLAUDE.md section 11).
 *
 * <p>The internal tenant UUID is deliberately absent. The institution is identified to the public by
 * its name snapshot alone; exposing organization and university ids on an anonymous endpoint would
 * hand out a join key nobody needs to read a quote.
 */
public record PublicTestimonialResponse(
        String id,
        String authorDisplayName,
        String authorRole,
        String authorAudience,
        String authorAffiliation,
        String body,
        Integer rating) {

    public static PublicTestimonialResponse from(Testimonial testimonial) {
        return new PublicTestimonialResponse(
                testimonial.getId().toString(),
                testimonial.getAuthorDisplayName(),
                // Null for a pre-derivation row. Passed through as null rather than filled in with a
                // guess, so the card shows the broad audience wording instead of a job title nobody
                // verified.
                testimonial.getAuthorRole() == null ? null : testimonial.getAuthorRole().name(),
                testimonial.getAuthorAudience().name(),
                testimonial.getAuthorAffiliation(),
                testimonial.getBody(),
                // Null for a testimonial written before ratings existed. Passed through as null
                // rather than coerced to a number, so the card can omit the stars instead of
                // showing a score its author never gave.
                testimonial.getRating());
    }
}
