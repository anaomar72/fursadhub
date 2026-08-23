package com.fursadhub.candidacy.domain;

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
 * A university's nomination of one of its verified students for a targeted opportunity
 * (CLAUDE.md section 35).
 *
 * <p>This is deliberately NOT the candidacy. A nomination exists before the student has consented,
 * carries university/coordinator metadata, and keeps its own history. Creating one must never by
 * itself expose the student to the organization — only {@link #accept()} causes a candidacy to be
 * created or merged, which is the moment the organization first gains access.
 *
 * <p>{@code ACCEPTED} means "the student agrees to be considered" — it is emphatically not
 * acceptance of an internship offer (CLAUDE.md section 35).
 */
@Entity
@Table(name = "nominations")
public class Nomination {

    @Id
    private UUID id;

    @Column(name = "opportunity_id", nullable = false)
    private UUID opportunityId;

    @Column(name = "opportunity_target_id", nullable = false)
    private UUID opportunityTargetId;

    @Column(name = "university_id", nullable = false)
    private UUID universityId;

    /** Snapshot: which department scope this nomination was actually made under. */
    @Column(name = "department_id", nullable = false)
    private UUID departmentId;

    @Column(name = "student_user_id", nullable = false)
    private UUID studentUserId;

    @Column(name = "nominated_by_user_id", nullable = false)
    private UUID nominatedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NominationStatus status;

    @Column(length = 1000)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    protected Nomination() {
    }

    public static Nomination create(
            UUID opportunityId, UUID opportunityTargetId, UUID universityId, UUID departmentId, UUID studentUserId,
            UUID nominatedByUserId, String note) {
        Instant now = Instant.now();
        Nomination nomination = new Nomination();
        nomination.id = UUID.randomUUID();
        nomination.opportunityId = opportunityId;
        nomination.opportunityTargetId = opportunityTargetId;
        nomination.universityId = universityId;
        nomination.departmentId = departmentId;
        nomination.studentUserId = studentUserId;
        nomination.nominatedByUserId = nominatedByUserId;
        nomination.note = note;
        nomination.status = NominationStatus.PENDING_STUDENT_CONSENT;
        nomination.createdAt = now;
        nomination.updatedAt = now;
        return nomination;
    }

    /** Student consent. Only the nominated student may call this (enforced by the application layer). */
    public void accept() {
        requirePending();
        this.status = NominationStatus.ACCEPTED;
        touchResponse();
    }

    /** Student refusal. The organization never gains access to a candidacy from a declined nomination. */
    public void decline() {
        requirePending();
        this.status = NominationStatus.DECLINED;
        touchResponse();
    }

    /** University staff retracting a nomination the student has not yet responded to. */
    public void withdraw() {
        requirePending();
        this.status = NominationStatus.WITHDRAWN;
        touchResponse();
    }

    public boolean isPendingConsent() {
        return status == NominationStatus.PENDING_STUDENT_CONSENT;
    }

    private void requirePending() {
        if (status != NominationStatus.PENDING_STUDENT_CONSENT) {
            throw new ApiException("NOMINATION_ALREADY_RESOLVED", HttpStatus.CONFLICT,
                    "This nomination has already been responded to.");
        }
    }

    private void touchResponse() {
        Instant now = Instant.now();
        this.respondedAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOpportunityId() {
        return opportunityId;
    }

    public UUID getOpportunityTargetId() {
        return opportunityTargetId;
    }

    public UUID getUniversityId() {
        return universityId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public UUID getStudentUserId() {
        return studentUserId;
    }

    public UUID getNominatedByUserId() {
        return nominatedByUserId;
    }

    public NominationStatus getStatus() {
        return status;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }
}
