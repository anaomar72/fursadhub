package com.fursadhub.verification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A single university-attestation review case for one {@code StudentEnrollment} (CLAUDE.md
 * section 29-30). A new case is created in {@code SUBMITTED} status the first time a student
 * submits their claimed enrollment for review; it is never created in {@code DRAFT} — the
 * "unverified/not yet submitted" state is represented by the enrollment simply having no case yet.
 *
 * <p>Transition legality (e.g. rejecting an already-{@code VERIFIED} case) is enforced by the
 * calling application service, not here — this entity only exposes state queries and simple
 * mutators, mirroring {@code EmailVerificationToken}/{@code PasswordResetToken} in the identity
 * module.
 */
@Entity
@Table(name = "student_verification_cases")
public class StudentVerificationCase {

    @Id
    private UUID id;

    @Column(name = "enrollment_id", nullable = false)
    private UUID enrollmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private StudentVerificationStatus status;

    @Column(name = "review_notes", length = 2000)
    private String reviewNotes;

    @Column(name = "reviewed_by_user_id")
    private UUID reviewedByUserId;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentVerificationCase() {
    }

    public static StudentVerificationCase submit(UUID enrollmentId) {
        Instant now = Instant.now();
        StudentVerificationCase verificationCase = new StudentVerificationCase();
        verificationCase.id = UUID.randomUUID();
        verificationCase.enrollmentId = enrollmentId;
        verificationCase.status = StudentVerificationStatus.SUBMITTED;
        verificationCase.submittedAt = now;
        verificationCase.createdAt = now;
        verificationCase.updatedAt = now;
        return verificationCase;
    }

    public void resubmit() {
        this.status = StudentVerificationStatus.SUBMITTED;
        this.submittedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void beginReview(UUID reviewerId) {
        this.status = StudentVerificationStatus.UNDER_REVIEW;
        this.reviewedByUserId = reviewerId;
        this.updatedAt = Instant.now();
    }

    public void requestMoreEvidence(UUID reviewerId, String notes) {
        this.status = StudentVerificationStatus.NEEDS_MORE_EVIDENCE;
        this.reviewedByUserId = reviewerId;
        this.reviewNotes = notes;
        this.reviewedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void approve(UUID reviewerId) {
        this.status = StudentVerificationStatus.VERIFIED;
        this.reviewedByUserId = reviewerId;
        this.reviewedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void reject(UUID reviewerId, String reason) {
        this.status = StudentVerificationStatus.REJECTED;
        this.reviewedByUserId = reviewerId;
        this.reviewNotes = reason;
        this.reviewedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void revoke(UUID reviewerId, String reason) {
        this.status = StudentVerificationStatus.REVOKED;
        this.reviewedByUserId = reviewerId;
        this.reviewNotes = reason;
        this.reviewedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean isResolved() {
        return status == StudentVerificationStatus.VERIFIED
                || status == StudentVerificationStatus.REJECTED
                || status == StudentVerificationStatus.REVOKED;
    }

    public boolean isReviewable() {
        return status == StudentVerificationStatus.SUBMITTED || status == StudentVerificationStatus.UNDER_REVIEW;
    }

    public UUID getId() {
        return id;
    }

    public UUID getEnrollmentId() {
        return enrollmentId;
    }

    public StudentVerificationStatus getStatus() {
        return status;
    }

    public String getReviewNotes() {
        return reviewNotes;
    }

    public UUID getReviewedByUserId() {
        return reviewedByUserId;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
