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

    /**
     * Evidence supporting the enrollment claim (Phase 7). Private: readable only by scoped university
     * reviewers and platform verification officers, and never by any organization user
     * (CLAUDE.md sections 31, 60).
     */
    @Column(name = "evidence_stored_file_id")
    private UUID evidenceStoredFileId;

    @Column(name = "evidence_uploaded_at")
    private Instant evidenceUploadedAt;

    /**
     * Escalation to the platform (Phase 7). NOT a status: the frozen state machine in
     * {@link StudentVerificationStatus} is untouched, and an escalated case still moves through the
     * same states. This flag only changes WHO may act on it — a university that cannot resolve a case
     * hands it to a platform verification officer, who works it with the same transitions.
     */
    @Column(name = "escalated_at")
    private Instant escalatedAt;

    @Column(name = "escalated_by_user_id")
    private UUID escalatedByUserId;

    @Column(name = "escalation_reason", length = 2000)
    private String escalationReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentVerificationCase() {
    }

    /** Attaches or replaces the evidence document. The previous file is removed by the service. */
    public void attachEvidence(UUID storedFileId) {
        this.evidenceStoredFileId = storedFileId;
        this.evidenceUploadedAt = Instant.now();
        this.updatedAt = this.evidenceUploadedAt;
    }

    /** Hands the case to the platform. Idempotent — re-escalating keeps the original record. */
    public void escalate(UUID staffUserId, String reason) {
        if (escalatedAt != null) {
            return;
        }
        this.escalatedAt = Instant.now();
        this.escalatedByUserId = staffUserId;
        this.escalationReason = reason;
        this.updatedAt = this.escalatedAt;
    }

    public boolean isEscalated() {
        return escalatedAt != null;
    }

    public UUID getEvidenceStoredFileId() {
        return evidenceStoredFileId;
    }

    public Instant getEvidenceUploadedAt() {
        return evidenceUploadedAt;
    }

    public Instant getEscalatedAt() {
        return escalatedAt;
    }

    public UUID getEscalatedByUserId() {
        return escalatedByUserId;
    }

    public String getEscalationReason() {
        return escalationReason;
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
