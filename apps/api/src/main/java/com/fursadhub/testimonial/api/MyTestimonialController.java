package com.fursadhub.testimonial.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.testimonial.application.TestimonialService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * An authenticated user's own testimonial, in whatever role they actually hold.
 *
 * <p>Every FursadHub role may share a story here — student, organization staff, university staff and
 * FursadHub's own platform staff. There is one endpoint for all of them rather than a per-role
 * surface, because the role is not something the caller states: it is derived from the JWT subject's
 * current membership (CLAUDE.md section 12/24) and frozen into the row.
 *
 * <p>The author is the JWT subject and is never read from the request body, so the browser cannot
 * post a quote in another person's name or read anyone else's submission. Submitting produces a
 * SUBMITTED row and nothing more — publication is a separate command on a different controller,
 * which refuses the author even when the author is a super admin.
 */
@RestController
@RequestMapping("/api/v1/me/testimonial")
public class MyTestimonialController {

    private final TestimonialService testimonials;

    public MyTestimonialController(TestimonialService testimonials) {
        this.testimonials = testimonials;
    }

    @GetMapping
    public List<TestimonialResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return testimonials.mine(currentUserId(jwt)).stream().map(TestimonialResponse::from).toList();
    }

    /**
     * The attribution the caller would be published under. Lets the form state the role as a fact
     * instead of offering it as a choice.
     */
    @GetMapping("/context")
    public TestimonialAuthorContextResponse context(@AuthenticationPrincipal Jwt jwt) {
        return testimonials.authorContext(currentUserId(jwt))
                .map(TestimonialAuthorContextResponse::from)
                .orElseGet(TestimonialAuthorContextResponse::ineligible);
    }

    @PostMapping
    public TestimonialResponse submit(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SubmitTestimonialRequest request, HttpServletRequest httpRequest) {
        return TestimonialResponse.from(testimonials.submit(
                currentUserId(jwt), request.authorDisplayName(), request.body(), request.rating(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private static UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
