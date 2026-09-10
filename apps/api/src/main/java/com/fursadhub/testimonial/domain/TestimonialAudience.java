package com.fursadhub.testimonial.domain;

/**
 * The broad group an author speaks for.
 *
 * <p>This column is the original {@code author_role} under its accurate name (see V52). Rows written
 * before roles were derived carry a value the author chose for themselves and nothing more precise;
 * rows written since carry the audience of their derived {@link TestimonialAuthorRole}, so the two
 * are always consistent going forward.
 *
 * <p>{@code PLATFORM} is new with the role expansion and can only ever be produced by derivation —
 * no author has ever been able to type it.
 */
public enum TestimonialAudience {
    STUDENT,
    ORGANIZATION,
    UNIVERSITY,
    PLATFORM
}
