package com.fursadhub.testimonial.api;

import com.fursadhub.testimonial.application.TestimonialService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Published testimonials, readable without a token.
 *
 * <p>Under {@code /public/}, which {@code SecurityConfig} permits anonymously. There is exactly one
 * verb here and it takes no filter: the caller cannot ask for a status, so no request shape reaches
 * an unmoderated or rejected quote. An empty list is the correct and expected response on a
 * database whose moderators have not published anything yet.
 */
@RestController
@RequestMapping("/api/v1/public/testimonials")
public class PublicTestimonialController {

    private final TestimonialService testimonials;

    public PublicTestimonialController(TestimonialService testimonials) {
        this.testimonials = testimonials;
    }

    @GetMapping
    public List<PublicTestimonialResponse> published() {
        return testimonials.published().stream().map(PublicTestimonialResponse::from).toList();
    }
}
