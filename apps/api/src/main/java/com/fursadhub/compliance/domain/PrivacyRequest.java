package com.fursadhub.compliance.domain;

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
 * One data-subject request and its review (CLAUDE.md section 50).
 *
 * <p>The state machine is frozen at SUBMITTED, IN_REVIEW, COMPLETED, REJECTED, and it only ever moves
 * forward: a resolved request is never reopened, because the resolution is a record of what FursadHub
 * actually did. A user who is unhappy with an outcome submits a new request, which leaves both the
 * original decision and the challenge to it intact.
 *
 * <p>Processing is MANUAL for the pilot, which section 50 explicitly permits. Nothing here deletes or
 * exports anything: an ERASURE that fired on its own would happily destroy records tied to a live
 * placement or an open verification case, so a human decides what can actually be done and records
 * it here.
 */
@Entity
@Table(name = "privacy_requests")
public class PrivacyRequest {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 40)
    private PrivacyRequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PrivacyRequestState state;

    @Column(length = 4000)
    private String details;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_by_user_id")
    private UUID reviewedByUserId;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "resolution_note", length = 4000)
    private String resolutionNote;

    protected PrivacyRequest() {
    }

    public static PrivacyRequest submit(UUID userId, PrivacyRequestType requestType, String details) {
        PrivacyRequest request = new PrivacyRequest();
        request.id = UUID.randomUUID();
        request.userId = userId;
        request.requestType = requestType;
        request.state = PrivacyRequestState.SUBMITTED;
        request.details = details;
        request.submittedAt = Instant.now();
        return request;
    }

    /** SUBMITTED -&gt; IN_REVIEW. Idempotent, so a second reviewer opening it changes nothing. */
    public void beginReview(UUID reviewerId) {
        if (state == PrivacyRequestState.IN_REVIEW) {
            return;
        }
        requireState(PrivacyRequestState.SUBMITTED);
        this.state = PrivacyRequestState.IN_REVIEW;
        this.reviewedByUserId = reviewerId;
    }

    /** SUBMITTED/IN_REVIEW -&gt; COMPLETED. */
    public void complete(UUID reviewerId, String note) {
        requireOpen();
        this.state = PrivacyRequestState.COMPLETED;
        resolve(reviewerId, note);
    }

    /** SUBMITTED/IN_REVIEW -&gt; REJECTED. The note is the reason, and is required by the service. */
    public void reject(UUID reviewerId, String note) {
        requireOpen();
        this.state = PrivacyRequestState.REJECTED;
        resolve(reviewerId, note);
    }

    private void resolve(UUID reviewerId, String note) {
        this.reviewedByUserId = reviewerId;
        this.reviewedAt = Instant.now();
        this.resolutionNote = note;
    }

    private void requireOpen() {
        if (state.isTerminal()) {
            throw invalidTransition();
        }
    }

    private void requireState(PrivacyRequestState expected) {
        if (state != expected) {
            throw invalidTransition();
        }
    }

    private ApiException invalidTransition() {
        return new ApiException("PRIVACY_REQUEST_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "That privacy request cannot change state that way.");
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public PrivacyRequestType getRequestType() {
        return requestType;
    }

    public PrivacyRequestState getState() {
        return state;
    }

    public String getDetails() {
        return details;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public UUID getReviewedByUserId() {
        return reviewedByUserId;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }
}
