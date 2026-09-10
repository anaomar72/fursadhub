package com.fursadhub.testimonial.infrastructure.persistence;

import com.fursadhub.testimonial.domain.Testimonial;
import com.fursadhub.testimonial.domain.TestimonialRepository;
import com.fursadhub.testimonial.domain.TestimonialStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class TestimonialRepositoryAdapter implements TestimonialRepository {

    private final JpaTestimonialRepository jpaRepository;

    TestimonialRepositoryAdapter(JpaTestimonialRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Testimonial save(Testimonial testimonial) {
        return jpaRepository.save(testimonial);
    }

    @Override
    public Optional<Testimonial> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Testimonial> findPublished(int limit) {
        // The status filter is bound here rather than passed in, so no caller can widen this to
        // return SUBMITTED or REJECTED rows through the public endpoint.
        return jpaRepository.findByStatusOrderByModeratedAtDesc(
                TestimonialStatus.PUBLISHED, PageRequest.of(0, limit));
    }

    @Override
    public Optional<Testimonial> findLiveByAuthor(UUID authorUserId) {
        return jpaRepository.findByAuthorUserIdAndStatusIn(authorUserId,
                List.of(TestimonialStatus.SUBMITTED, TestimonialStatus.PUBLISHED));
    }

    @Override
    public List<Testimonial> findByAuthor(UUID authorUserId) {
        return jpaRepository.findByAuthorUserIdOrderBySubmittedAtDesc(authorUserId);
    }

    @Override
    public Page<Testimonial> search(TestimonialStatus status, Pageable pageable) {
        return jpaRepository.search(status, pageable);
    }

    @Override
    public long countByStatus(TestimonialStatus status) {
        return jpaRepository.countByStatus(status);
    }
}
