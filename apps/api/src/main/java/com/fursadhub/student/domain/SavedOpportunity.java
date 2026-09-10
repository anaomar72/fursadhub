package com.fursadhub.student.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One internship a student has bookmarked (Backend Phase B4).
 *
 * <p><strong>Private preference data.</strong> A bookmark says only that this student wants to find
 * this opportunity again. It is not an application, not a candidacy, and not a signal to the
 * organization — no recruiter, university or administrator sees it, and nothing about it feeds the
 * recruitment pipeline.
 *
 * <p>Keyed by {@code studentUserId} referencing {@code users.id}, which is the canonical identity
 * for student-owned data throughout this codebase: {@code student_enrollments}, {@code nominations},
 * {@code candidacies} and {@code placements} all reference {@code users (id)} under the column name
 * {@code student_user_id}, and {@code student_profiles} is itself keyed by the user id. A separate
 * profile-surrogate key would have been a second student identity for no gain.
 *
 * <p><strong>Durable across visibility changes.</strong> The row is never deleted because the
 * opportunity stopped being publicly discoverable — if the owning organization is suspended or the
 * opportunity is paused, the bookmark survives and simply stops appearing in the student's visible
 * list. That preserves the student's intent, and lets the item reappear on its own if the
 * opportunity becomes discoverable again, with no second bookmark and no repair pass. Only the
 * student, by unsaving, or a cascade from the deletion of the user or the opportunity, removes it.
 */
@Entity
@Table(name = "student_saved_opportunities")
public class SavedOpportunity {

    /**
     * The database constraint that makes a bookmark unique per student, named here so the idempotent
     * save can recognise THIS violation specifically rather than treating every integrity failure as
     * a duplicate. Must match {@code uk_student_saved_opportunities} in V44.
     */
    public static final String UNIQUE_CONSTRAINT = "uk_student_saved_opportunities";

    @Id
    private UUID id;

    @Column(name = "student_user_id", nullable = false)
    private UUID studentUserId;

    @Column(name = "opportunity_id", nullable = false)
    private UUID opportunityId;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt;

    protected SavedOpportunity() {
    }

    public static SavedOpportunity create(UUID studentUserId, UUID opportunityId) {
        SavedOpportunity saved = new SavedOpportunity();
        saved.id = UUID.randomUUID();
        saved.studentUserId = studentUserId;
        saved.opportunityId = opportunityId;
        saved.savedAt = Instant.now();
        return saved;
    }

    public UUID getId() {
        return id;
    }

    public UUID getStudentUserId() {
        return studentUserId;
    }

    public UUID getOpportunityId() {
        return opportunityId;
    }

    public Instant getSavedAt() {
        return savedAt;
    }
}
