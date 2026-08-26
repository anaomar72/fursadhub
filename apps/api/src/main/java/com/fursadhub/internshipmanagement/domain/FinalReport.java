package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The student's final internship report (CLAUDE.md section 45).
 *
 * <p>This row is only a pointer plus a review lifecycle. The document itself lives in private
 * object storage; reading its bytes requires passing the placement's authorization check, and the
 * storage key is never rendered into a URL (CLAUDE.md section 47).
 *
 * <p>APPROVED is terminal. There is no transition out of it, so an approved report cannot be edited,
 * re-uploaded or quietly replaced — that would need an explicit business rule which does not exist.
 */
@Entity
@Table(name = "final_reports")
public class FinalReport {

    /** The frozen transition table (CLAUDE.md section 45). APPROVED accepts nothing. */
    private static final Map<FinalReportState, Set<FinalReportState>> ALLOWED_TRANSITIONS = Map.of(
            FinalReportState.DRAFT, EnumSet.of(FinalReportState.SUBMITTED),
            FinalReportState.SUBMITTED, EnumSet.of(FinalReportState.NEEDS_REVISION, FinalReportState.APPROVED),
            FinalReportState.NEEDS_REVISION, EnumSet.of(FinalReportState.SUBMITTED));

    /** The states in which the student may still attach or replace the PDF. */
    private static final Set<FinalReportState> FILE_EDITABLE =
            EnumSet.of(FinalReportState.DRAFT, FinalReportState.NEEDS_REVISION);

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "stored_file_id")
    private UUID storedFileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FinalReportState state;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "review_comment", length = 2000)
    private String reviewComment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected FinalReport() {
    }

    public static FinalReport createDraft(UUID placementId) {
        Instant now = Instant.now();
        FinalReport report = new FinalReport();
        report.id = UUID.randomUUID();
        report.placementId = placementId;
        report.state = FinalReportState.DRAFT;
        report.createdAt = now;
        report.updatedAt = now;
        return report;
    }

    // ------------------------------------------------------------------ commands

    /**
     * Attaches (or replaces) the report PDF. Permitted only while the report is with the student —
     * a SUBMITTED report is with the reviewer, and an APPROVED one is finished.
     *
     * @return the previously attached file id, if any, so the caller can clean it up
     */
    public UUID attachFile(UUID newStoredFileId) {
        if (!FILE_EDITABLE.contains(state)) {
            throw invalidTransition();
        }
        UUID previous = this.storedFileId;
        this.storedFileId = newStoredFileId;
        this.updatedAt = Instant.now();
        return previous;
    }

    /** DRAFT or NEEDS_REVISION to SUBMITTED. A report without a file cannot be submitted. */
    public void submit() {
        if (storedFileId == null) {
            throw new ApiException("FINAL_REPORT_FILE_MISSING", HttpStatus.BAD_REQUEST,
                    "Attach the report document before submitting it.");
        }
        transitionTo(FinalReportState.SUBMITTED);
        this.submittedAt = this.updatedAt;
        this.reviewedAt = null;
        this.reviewedBy = null;
    }

    /** SUBMITTED to NEEDS_REVISION. The comment tells the student what to fix. */
    public void requestRevision(UUID reviewerUserId, String comment) {
        transitionTo(FinalReportState.NEEDS_REVISION);
        this.reviewedAt = this.updatedAt;
        this.reviewedBy = reviewerUserId;
        this.reviewComment = comment;
    }

    /** SUBMITTED to APPROVED. Terminal. */
    public void approve(UUID reviewerUserId, String comment) {
        transitionTo(FinalReportState.APPROVED);
        this.reviewedAt = this.updatedAt;
        this.reviewedBy = reviewerUserId;
        this.reviewComment = comment;
    }

    private void transitionTo(FinalReportState target) {
        if (!ALLOWED_TRANSITIONS.getOrDefault(state, Set.of()).contains(target)) {
            throw invalidTransition();
        }
        this.state = target;
        this.updatedAt = Instant.now();
    }

    private ApiException invalidTransition() {
        return new ApiException("FINAL_REPORT_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This final report cannot move to that state from its current state.");
    }

    // ------------------------------------------------------------------ queries

    /** APPROVED is the only state that satisfies the final-report requirement. */
    public boolean countsTowardsCompletion() {
        return state == FinalReportState.APPROVED;
    }

    public boolean isFileEditable() {
        return FILE_EDITABLE.contains(state);
    }

    public UUID getId() {
        return id;
    }

    public UUID getPlacementId() {
        return placementId;
    }

    public UUID getStoredFileId() {
        return storedFileId;
    }

    public FinalReportState getState() {
        return state;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public UUID getReviewedBy() {
        return reviewedBy;
    }

    public String getReviewComment() {
        return reviewComment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }
}
