package com.fursadhub.administration.api;

import com.fursadhub.common.api.PageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.testimonial.api.ModerationNoteRequest;
import com.fursadhub.testimonial.api.TestimonialResponse;
import com.fursadhub.testimonial.application.TestimonialService;
import com.fursadhub.testimonial.domain.Testimonial;
import com.fursadhub.testimonial.domain.TestimonialStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Testimonial moderation, alongside the console's other SUPER_ADMIN queues.
 *
 * <p>Placed here for the same reason {@link AdminComplianceController} is: the administration module
 * owns the admin HTTP surface and delegates to the owning module's service, which is where the
 * authorization actually lives ({@code TestimonialService} calls {@code requireSuperAdmin} on every
 * method below — this controller never authorizes by itself).
 *
 * <p>Each transition is an explicit command (CLAUDE.md section 10). There is no generic status write,
 * so a client cannot PATCH a testimonial into PUBLISHED. Note also what is absent: no endpoint edits
 * the quote. A moderator publishes the author's words or refuses them.
 */
@RestController
@RequestMapping("/api/v1/admin/testimonials")
public class AdminTestimonialController {

    private static final int MAX_PAGE_SIZE = 100;

    private final TestimonialService testimonials;

    public AdminTestimonialController(TestimonialService testimonials) {
        this.testimonials = testimonials;
    }

    @GetMapping
    public PageResponse<TestimonialResponse> queue(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) TestimonialStatus status,
            @PageableDefault(size = 25) Pageable pageable) {
        Page<Testimonial> page = testimonials.queue(currentUserId(jwt), status, capPageSize(pageable));
        return PageResponse.from(page, TestimonialResponse::from);
    }

    @PostMapping("/{testimonialId}/publish")
    public TestimonialResponse publish(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID testimonialId, HttpServletRequest httpRequest) {
        return TestimonialResponse.from(testimonials.publish(currentUserId(jwt), testimonialId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** Takes a live quote off the public site and back into the queue, without destroying it. */
    @PostMapping("/{testimonialId}/unpublish")
    public TestimonialResponse unpublish(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID testimonialId, @Valid @RequestBody ModerationNoteRequest request,
            HttpServletRequest httpRequest) {
        return TestimonialResponse.from(testimonials.unpublish(currentUserId(jwt), testimonialId,
                request.note(), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{testimonialId}/reject")
    public TestimonialResponse reject(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID testimonialId, @Valid @RequestBody ModerationNoteRequest request,
            HttpServletRequest httpRequest) {
        return TestimonialResponse.from(testimonials.reject(currentUserId(jwt), testimonialId,
                request.note(), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private static Pageable capPageSize(Pageable pageable) {
        return pageable.getPageSize() > MAX_PAGE_SIZE
                ? PageRequest.of(pageable.getPageNumber(), MAX_PAGE_SIZE, pageable.getSort())
                : pageable;
    }

    private static UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
