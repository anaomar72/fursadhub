package com.fursadhub.testimonial.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * One real person's testimonial, and the moderation decision on it.
 *
 * <p>Three rules give this entity its whole shape:
 *
 * <ul>
 *   <li><b>Nothing self-publishes.</b> {@link #submit} can only produce {@code SUBMITTED}. There is
 *       no constructor, factory or setter anywhere that yields {@code PUBLISHED} — that state is
 *       reachable only through {@link #publish}, which the service gates on a platform moderator who
 *       is not the author. So an author who reaches the submit endpoint cannot put words on the
 *       public home page.</li>
 *   <li><b>The words are the author's.</b> The body is stored exactly as submitted and is never
 *       edited here. A moderator publishes it or rejects it; there is deliberately no "edit the
 *       quote" operation, because a testimonial a moderator rewrote is not a testimonial.</li>
 *   <li><b>The role is FursadHub's.</b> Attribution is split: the display name is the author's own
 *       choice, because a byline is a consent decision and an account email is not a byline. The
 *       ROLE and the INSTITUTION are not theirs to choose — those arrive as a resolved
 *       {@link TestimonialAuthorContext}, derived from the submitting account's real membership, so
 *       nobody can sign a quote with a role they do not hold or an employer they do not work for.</li>
 * </ul>
 *
 * <p>The role and tenant fields are a SNAPSHOT, never a live join. A testimonial records who the
 * person was when they wrote it; a later promotion, transfer or departure must not silently rewrite
 * words that are already published under the old attribution, nor strip the attribution off them.
 */
@Entity
@Table(name = "testimonials")
public class Testimonial {

    @Id
    private UUID id;

    @Column(name = "author_user_id", nullable = false)
    private UUID authorUserId;

    @Column(name = "author_display_name", nullable = false, length = 120)
    private String authorDisplayName;

    /**
     * The broad group the author speaks for. NOT NULL for every row: rows written before roles were
     * derived carry the value their author chose under this column's old name ({@code author_role},
     * renamed in V52), and rows written since carry their role's audience.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "author_audience", nullable = false, length = 40)
    private TestimonialAudience authorAudience;

    /**
     * The author's real role, derived by the server. NULL only for testimonials written before
     * derivation existed — V52 deliberately backfills nothing rather than guessing a job title for a
     * real person. {@link #submit} makes it impossible for a NEW row to be null.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "author_role", length = 40)
    private TestimonialAuthorRole authorRole;

    /**
     * The institution's name as it stood at submission. Server-derived for every row written since
     * V52; on older rows it is whatever the author typed into the old free-text field.
     */
    @Column(name = "author_affiliation", length = 160)
    private String authorAffiliation;

    @Enumerated(EnumType.STRING)
    @Column(name = "author_tenant_type", length = 20)
    private TestimonialTenantType authorTenantType;

    /** Stable reference to the tenant. Intentionally not a mapped association — see V52. */
    @Column(name = "author_tenant_id")
    private UUID authorTenantId;

    @Column(nullable = false, length = 1000)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TestimonialStatus status;

    /**
     * The author's own 1-5 star rating.
     *
     * <p>Nullable, and that is deliberate. Testimonials written before rating support existed have
     * no rating and never will — inventing one would attribute a score to a real person who never
     * gave it. {@link #submit} requires a valid rating for every NEW testimonial, so the null case
     * is strictly historical rather than a gap a new submission can walk through.
     */
    @Column(name = "rating")
    private Integer rating;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "moderated_by_user_id")
    private UUID moderatedByUserId;

    @Column(name = "moderated_at")
    private Instant moderatedAt;

    @Column(name = "moderation_note", length = 1000)
    private String moderationNote;

    protected Testimonial() {
    }

    /**
     * The only way to create a testimonial.
     *
     * <p>Takes a resolved {@link TestimonialAuthorContext} rather than loose role and affiliation
     * strings, so there is no signature anywhere in the codebase — controller, service or test
     * fixture — through which caller-chosen attribution could reach a row. The author supplies the
     * two things that are genuinely theirs to supply: the name they want printed, and their words.
     */
    public static Testimonial submit(UUID authorUserId, String authorDisplayName,
            TestimonialAuthorContext context, String body, Integer rating) {
        requireValidRating(rating);
        if (context == null) {
            throw new ApiException("TESTIMONIAL_ROLE_NOT_RESOLVED", HttpStatus.FORBIDDEN,
                    "We could not determine your FursadHub role.");
        }
        Testimonial testimonial = new Testimonial();
        testimonial.id = UUID.randomUUID();
        testimonial.authorUserId = authorUserId;
        testimonial.authorDisplayName = authorDisplayName.trim();
        testimonial.authorRole = context.role();
        testimonial.authorAudience = context.audience();
        testimonial.authorTenantType = context.tenantType();
        testimonial.authorTenantId = context.tenantId();
        testimonial.authorAffiliation = blankToNull(context.tenantDisplayName());
        testimonial.body = body.trim();
        testimonial.rating = rating;
        testimonial.status = TestimonialStatus.SUBMITTED;
        testimonial.submittedAt = Instant.now();
        return testimonial;
    }

    /** SUBMITTED -&gt; PUBLISHED. Only from the moderation service, never from a submission path. */
    public void publish(UUID moderatorId) {
        requireStatus(TestimonialStatus.SUBMITTED);
        this.status = TestimonialStatus.PUBLISHED;
        moderate(moderatorId, null);
    }

    /** PUBLISHED -&gt; SUBMITTED. Takes a live quote off the public site without destroying it. */
    public void unpublish(UUID moderatorId, String note) {
        requireStatus(TestimonialStatus.PUBLISHED);
        this.status = TestimonialStatus.SUBMITTED;
        moderate(moderatorId, note);
    }

    /** SUBMITTED/PUBLISHED -&gt; REJECTED, terminal. The note is the reason and the service requires it. */
    public void reject(UUID moderatorId, String note) {
        if (!status.isLive()) {
            throw invalidTransition();
        }
        this.status = TestimonialStatus.REJECTED;
        moderate(moderatorId, note);
    }

    private void moderate(UUID moderatorId, String note) {
        this.moderatedByUserId = moderatorId;
        this.moderatedAt = Instant.now();
        this.moderationNote = blankToNull(note);
    }

    private void requireStatus(TestimonialStatus expected) {
        if (status != expected) {
            throw invalidTransition();
        }
    }

    private ApiException invalidTransition() {
        return new ApiException("TESTIMONIAL_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "That testimonial cannot change state that way.");
    }

    /**
     * Every new testimonial carries a real rating. Enforced here, in the domain, so that no caller —
     * controller, service or test fixture — can create an unrated testimonial going forward, and the
     * historical NULLs remain the only unrated rows that exist. The database CHECK added in V51 is
     * the same invariant one layer down (CLAUDE.md section 52).
     */
    private static void requireValidRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new ApiException("TESTIMONIAL_RATING_INVALID", HttpStatus.BAD_REQUEST,
                    "Choose a rating between 1 and 5 stars.");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAuthorUserId() {
        return authorUserId;
    }

    public String getAuthorDisplayName() {
        return authorDisplayName;
    }

    /** The derived role, or null for a testimonial written before roles were derived. */
    public TestimonialAuthorRole getAuthorRole() {
        return authorRole;
    }

    public TestimonialAudience getAuthorAudience() {
        return authorAudience;
    }

    public TestimonialTenantType getAuthorTenantType() {
        return authorTenantType;
    }

    public UUID getAuthorTenantId() {
        return authorTenantId;
    }

    public String getAuthorAffiliation() {
        return authorAffiliation;
    }

    public String getBody() {
        return body;
    }

    public TestimonialStatus getStatus() {
        return status;
    }

    /** The author's 1-5 rating, or null for a testimonial written before ratings existed. */
    public Integer getRating() {
        return rating;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public UUID getModeratedByUserId() {
        return moderatedByUserId;
    }

    public Instant getModeratedAt() {
        return moderatedAt;
    }

    public String getModerationNote() {
        return moderationNote;
    }
}
