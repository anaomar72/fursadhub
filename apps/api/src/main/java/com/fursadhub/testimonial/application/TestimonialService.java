package com.fursadhub.testimonial.application;

import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.testimonial.domain.Testimonial;
import com.fursadhub.testimonial.domain.TestimonialAuthorContext;
import com.fursadhub.testimonial.domain.TestimonialRepository;
import com.fursadhub.testimonial.domain.TestimonialStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Testimonial submission and moderation.
 *
 * <p>Three audiences, three authorizations:
 *
 * <ul>
 *   <li>ANYONE, with no token, reads {@link #published()}. That method reaches the database through
 *       a repository call whose status filter is fixed at PUBLISHED, so an unmoderated or rejected
 *       quote has no path to the public site even if a caller asks for one.</li>
 *   <li>An AUTHENTICATED user in ANY FursadHub role submits their own testimonial and reads their
 *       own submissions. The author is always the authenticated caller — a user id is never accepted
 *       from the browser (CLAUDE.md section 12) — and so is their ROLE: attribution is resolved by
 *       {@link TestimonialAuthorContextResolver} from current membership data, never read from the
 *       request. A recruiter therefore cannot publish a quote signed "Student".</li>
 *   <li>A SUPER_ADMIN moderates, and never their own words. Publication is a deliberate human act
 *       performed by someone other than the author; there is no auto-publish path, no trusted-author
 *       exemption and no scheduled promotion.</li>
 * </ul>
 *
 * <p>Nothing in this class writes example, seed or demo testimonials. An empty database means an
 * empty public list, which the frontend renders as an honest pending state.
 */
@Service
public class TestimonialService {

    /** The public site shows a short row; this bounds the query rather than the caller doing so. */
    private static final int PUBLIC_LIMIT = 6;

    private final TestimonialRepository testimonials;
    private final PlatformAuthorization authorization;
    private final TestimonialAuthorContextResolver authorContexts;
    private final AuditService audit;

    public TestimonialService(TestimonialRepository testimonials, PlatformAuthorization authorization,
            TestimonialAuthorContextResolver authorContexts, AuditService audit) {
        this.testimonials = testimonials;
        this.authorization = authorization;
        this.authorContexts = authorContexts;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- public

    @Transactional(readOnly = true)
    public List<Testimonial> published() {
        return testimonials.findPublished(PUBLIC_LIMIT);
    }

    // ---------------------------------------------------------------- author

    /**
     * How the caller would be attributed if they submitted right now.
     *
     * <p>Read-only, and it exists so the form can SHOW people their role rather than ask them for
     * it. The frontend displaying "You are sharing as: Recruiter · Acme Ltd" is a courtesy; the
     * value that actually reaches the row is resolved again inside {@link #submit}, from the same
     * source, at write time.
     */
    @Transactional(readOnly = true)
    public Optional<TestimonialAuthorContext> authorContext(UUID userId) {
        return authorContexts.resolve(userId);
    }

    @Transactional
    public Testimonial submit(UUID authorUserId, String displayName, String body, Integer rating,
            String ip, String userAgent) {
        // Role and institution come from PostgreSQL, not from the request. There is no parameter on
        // this method through which a caller could offer either one.
        TestimonialAuthorContext context = authorContexts.require(authorUserId);
        // Checked here for a clean error, and enforced by a partial unique index for concurrency:
        // two simultaneous submissions cannot both land (CLAUDE.md section 52).
        if (testimonials.findLiveByAuthor(authorUserId).isPresent()) {
            throw alreadySubmitted();
        }
        Testimonial testimonial;
        try {
            testimonial = testimonials.save(
                    Testimonial.submit(authorUserId, displayName, context, body, rating));
        } catch (DataIntegrityViolationException duplicate) {
            throw alreadySubmitted();
        }
        // The body is the author's own words and is never written to the audit trail. The role is,
        // because which role a story was attributed to is a moderation-relevant fact.
        audit.record("TESTIMONIAL_SUBMITTED", authorUserId, ip, userAgent,
                "testimonial " + testimonial.getId() + " as " + context.role());
        return testimonial;
    }

    @Transactional(readOnly = true)
    public List<Testimonial> mine(UUID authorUserId) {
        return testimonials.findByAuthor(authorUserId);
    }

    // ---------------------------------------------------------------- moderation

    @Transactional(readOnly = true)
    public Page<Testimonial> queue(UUID actingUserId, TestimonialStatus status, Pageable pageable) {
        authorization.requireSuperAdmin(actingUserId);
        return testimonials.search(status, pageable);
    }

    @Transactional(readOnly = true)
    public long pendingCount(UUID actingUserId) {
        authorization.requireSuperAdmin(actingUserId);
        return testimonials.countByStatus(TestimonialStatus.SUBMITTED);
    }

    @Transactional
    public Testimonial publish(UUID actingUserId, UUID testimonialId, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);
        Testimonial testimonial = require(testimonialId);
        requireNotOwnTestimonial(actingUserId, testimonial);
        testimonial.publish(actingUserId);
        testimonials.save(testimonial);
        audit.record("TESTIMONIAL_PUBLISHED", actingUserId, ip, userAgent, "testimonial " + testimonialId);
        return testimonial;
    }

    @Transactional
    public Testimonial unpublish(UUID actingUserId, UUID testimonialId, String note, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);
        Testimonial testimonial = require(testimonialId);
        requireNotOwnTestimonial(actingUserId, testimonial);
        testimonial.unpublish(actingUserId, note);
        testimonials.save(testimonial);
        audit.record("TESTIMONIAL_UNPUBLISHED", actingUserId, ip, userAgent, "testimonial " + testimonialId);
        return testimonial;
    }

    /** Rejection must say why: an unexplained refusal is not something the author can respond to. */
    @Transactional
    public Testimonial reject(UUID actingUserId, UUID testimonialId, String note, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);
        if (note == null || note.isBlank()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A reason is required when rejecting a testimonial.");
        }
        Testimonial testimonial = require(testimonialId);
        requireNotOwnTestimonial(actingUserId, testimonial);
        testimonial.reject(actingUserId, note);
        testimonials.save(testimonial);
        audit.record("TESTIMONIAL_REJECTED", actingUserId, ip, userAgent, "testimonial " + testimonialId);
        return testimonial;
    }

    /**
     * Nobody moderates their own testimonial.
     *
     * <p>Platform staff may now submit, which creates a moderator who is also an author. A super
     * admin approving their own quote onto the public home page is self-publication with an extra
     * HTTP call in front of it, and no amount of SUPER_ADMIN authority makes it a second person's
     * decision — so the check is on identity, not on role.
     *
     * <p>It covers unpublish and reject as well as publish, so the rule is simply "not your own row"
     * rather than a list of exceptions to remember. On a deployment with a single super admin their
     * own testimonial stays SUBMITTED until a second legitimate moderator exists, which is the
     * correct outcome rather than a bug.
     */
    private void requireNotOwnTestimonial(UUID actingUserId, Testimonial testimonial) {
        if (testimonial.getAuthorUserId().equals(actingUserId)) {
            throw new ApiException("TESTIMONIAL_SELF_MODERATION_DENIED", HttpStatus.FORBIDDEN,
                    "Another moderator must review your own testimonial.");
        }
    }

    private Testimonial require(UUID testimonialId) {
        return testimonials.findById(testimonialId).orElseThrow(() -> new ApiException(
                "TESTIMONIAL_NOT_FOUND", HttpStatus.NOT_FOUND, "That testimonial does not exist."));
    }

    private ApiException alreadySubmitted() {
        return new ApiException("TESTIMONIAL_ALREADY_SUBMITTED", HttpStatus.CONFLICT,
                "You already have a testimonial awaiting review or published.");
    }
}
