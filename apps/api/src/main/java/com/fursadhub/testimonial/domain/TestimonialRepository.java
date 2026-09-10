package com.fursadhub.testimonial.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TestimonialRepository {

    Testimonial save(Testimonial testimonial);

    Optional<Testimonial> findById(UUID id);

    /** What the public site reads. Nothing but PUBLISHED can come back from this. */
    List<Testimonial> findPublished(int limit);

    /** The author's own row, if they have one that is not rejected. */
    Optional<Testimonial> findLiveByAuthor(UUID authorUserId);

    List<Testimonial> findByAuthor(UUID authorUserId);

    /** Moderation queue. Status is optional so one query serves both "pending" and "everything". */
    Page<Testimonial> search(TestimonialStatus status, Pageable pageable);

    long countByStatus(TestimonialStatus status);
}
