package com.fursadhub.testimonial.infrastructure.persistence;

import com.fursadhub.testimonial.domain.Testimonial;
import com.fursadhub.testimonial.domain.TestimonialStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaTestimonialRepository extends JpaRepository<Testimonial, UUID> {

    List<Testimonial> findByStatusOrderByModeratedAtDesc(TestimonialStatus status, Pageable pageable);

    Optional<Testimonial> findByAuthorUserIdAndStatusIn(UUID authorUserId, List<TestimonialStatus> statuses);

    List<Testimonial> findByAuthorUserIdOrderBySubmittedAtDesc(UUID authorUserId);

    long countByStatus(TestimonialStatus status);

    @Query("""
            SELECT t FROM Testimonial t
            WHERE (:status IS NULL OR t.status = :status)
            ORDER BY t.submittedAt ASC
            """)
    Page<Testimonial> search(@Param("status") TestimonialStatus status, Pageable pageable);
}
