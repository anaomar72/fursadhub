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
import java.time.LocalDate;
import java.util.UUID;

/**
 * One day of attendance on a placement (CLAUDE.md section 43).
 *
 * <p>V1 attendance is a human record confirmed by humans. There is no GPS, geofence, device
 * fingerprint or biometric anywhere in this class or its table, and none may be added — that is an
 * explicit product decision, not an omission (CLAUDE.md section 27/43).
 *
 * <p>The confirmation state machine is small but deliberate. A dispute is never silently
 * overwritten: resolving one records who resolved it, what the corrected value is, and the note
 * explaining it, while the student's original dispute reason stays on its own field.
 */
@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_value", nullable = false, length = 20)
    private AttendanceValue attendanceValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "confirmation_status", nullable = false, length = 20)
    private AttendanceConfirmationStatus confirmationStatus;

    @Column(name = "recorded_by", nullable = false)
    private UUID recordedBy;

    @Column(name = "confirmed_by")
    private UUID confirmedBy;

    @Column(name = "disputed_by")
    private UUID disputedBy;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(length = 1000)
    private String notes;

    /** The student's own words. Never rewritten by a resolution. */
    @Column(name = "dispute_reason", length = 1000)
    private String disputeReason;

    @Column(name = "resolution_note", length = 1000)
    private String resolutionNote;

    @Column(name = "disputed_at")
    private Instant disputedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected AttendanceRecord() {
    }

    public static AttendanceRecord record(
            UUID placementId, LocalDate attendanceDate, AttendanceValue value, UUID recordedBy, String notes) {
        Instant now = Instant.now();
        AttendanceRecord record = new AttendanceRecord();
        record.id = UUID.randomUUID();
        record.placementId = placementId;
        record.attendanceDate = attendanceDate;
        record.attendanceValue = value;
        record.confirmationStatus = AttendanceConfirmationStatus.RECORDED;
        record.recordedBy = recordedBy;
        record.notes = notes;
        record.createdAt = now;
        record.updatedAt = now;
        return record;
    }

    // ------------------------------------------------------------------ commands

    /** RECORDED to CONFIRMED. The supervisor stands behind the record. */
    public void confirm(UUID confirmedByUserId) {
        if (confirmationStatus != AttendanceConfirmationStatus.RECORDED) {
            throw invalidTransition();
        }
        this.confirmationStatus = AttendanceConfirmationStatus.CONFIRMED;
        this.confirmedBy = confirmedByUserId;
        this.confirmedAt = touch();
    }

    /**
     * RECORDED or CONFIRMED to DISPUTED. The student says the record is wrong.
     *
     * <p>A confirmed record is disputable on purpose: the student may only notice the error after
     * the supervisor has already confirmed it, and the alternative would be an unchallengeable
     * attendance record.
     */
    public void dispute(UUID studentUserId, String reason) {
        if (confirmationStatus != AttendanceConfirmationStatus.RECORDED
                && confirmationStatus != AttendanceConfirmationStatus.CONFIRMED) {
            throw invalidTransition();
        }
        this.confirmationStatus = AttendanceConfirmationStatus.DISPUTED;
        this.disputedBy = studentUserId;
        this.disputeReason = reason;
        this.disputedAt = touch();
    }

    /**
     * DISPUTED to RESOLVED, optionally correcting the recorded value.
     *
     * <p>The dispute is settled, not erased: {@link #disputeReason} and {@link #disputedBy} survive,
     * so the record still shows that it was challenged and on what grounds.
     */
    public void resolve(UUID resolvedByUserId, AttendanceValue correctedValue, String resolutionNote) {
        if (confirmationStatus != AttendanceConfirmationStatus.DISPUTED) {
            throw invalidTransition();
        }
        if (correctedValue != null) {
            this.attendanceValue = correctedValue;
        }
        this.confirmationStatus = AttendanceConfirmationStatus.RESOLVED;
        this.resolvedBy = resolvedByUserId;
        this.resolutionNote = resolutionNote;
        this.resolvedAt = touch();
    }

    private Instant touch() {
        this.updatedAt = Instant.now();
        return this.updatedAt;
    }

    private ApiException invalidTransition() {
        return new ApiException("ATTENDANCE_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This attendance record cannot move to that state from its current state.");
    }

    // ------------------------------------------------------------------ queries

    /**
     * Settled means CONFIRMED or RESOLVED. Unsettled attendance (still RECORDED, or DISPUTED and
     * unanswered) is what blocks completion — see {@code CompletionRequirementEvaluator}.
     */
    public boolean isSettled() {
        return confirmationStatus.isSettled();
    }

    public UUID getId() {
        return id;
    }

    public UUID getPlacementId() {
        return placementId;
    }

    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }

    public AttendanceValue getAttendanceValue() {
        return attendanceValue;
    }

    public AttendanceConfirmationStatus getConfirmationStatus() {
        return confirmationStatus;
    }

    public UUID getRecordedBy() {
        return recordedBy;
    }

    public UUID getConfirmedBy() {
        return confirmedBy;
    }

    public UUID getDisputedBy() {
        return disputedBy;
    }

    public UUID getResolvedBy() {
        return resolvedBy;
    }

    public String getNotes() {
        return notes;
    }

    public String getDisputeReason() {
        return disputeReason;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public Instant getDisputedAt() {
        return disputedAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
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
