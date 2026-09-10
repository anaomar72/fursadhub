package com.fursadhub.testimonial.api;

import com.fursadhub.testimonial.domain.Testimonial;

/**
 * The moderation and own-submission view. Still never exposes the author's account identity.
 *
 * <p>Carries the derived role and audience so a moderator can see how a quote would be attributed
 * before deciding to publish it — that attribution is part of what they are approving.
 */
public record TestimonialResponse(
        String id,
        String authorDisplayName,
        String authorRole,
        String authorAudience,
        String authorAffiliation,
        String body,
        Integer rating,
        String status,
        String submittedAt,
        String moderatedAt,
        String moderationNote) {

    public static TestimonialResponse from(Testimonial testimonial) {
        return new TestimonialResponse(
                testimonial.getId().toString(),
                testimonial.getAuthorDisplayName(),
                testimonial.getAuthorRole() == null ? null : testimonial.getAuthorRole().name(),
                testimonial.getAuthorAudience().name(),
                testimonial.getAuthorAffiliation(),
                testimonial.getBody(),
                testimonial.getRating(),
                testimonial.getStatus().name(),
                testimonial.getSubmittedAt().toString(),
                testimonial.getModeratedAt() == null ? null : testimonial.getModeratedAt().toString(),
                testimonial.getModerationNote());
    }
}
