package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.internshipmanagement.domain.AttendanceConfirmationStatus;
import com.fursadhub.internshipmanagement.domain.AttendanceRecord;
import com.fursadhub.internshipmanagement.domain.AttendanceRecordRepository;
import com.fursadhub.internshipmanagement.domain.AttendanceValue;
import com.fursadhub.placement.domain.Placement;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Attendance use cases (CLAUDE.md section 43, Phase 6 sections 8-10).
 *
 * <p>V1 attendance is a human record confirmed by humans. No location, device or biometric signal is
 * accepted anywhere in this service, and there is no endpoint that could supply one.
 *
 * <p><strong>Who does what.</strong> The assigned ORGANIZATION supervisor records, confirms and
 * resolves — they are the person who actually saw whether the student was there. The owning STUDENT
 * may dispute a record, including one that has already been confirmed, because an error is often only
 * noticed after confirmation and an unchallengeable attendance record is not acceptable. University
 * staff in scope read attendance but do not author it: it is a workplace fact, not an academic one.
 *
 * <p><strong>Concurrency.</strong> Recording relies on {@code uk_attendance_placement_date} rather
 * than a check-then-insert, so two supervisors recording the same day concurrently produce one row
 * and one clean conflict. Each state command re-reads the record {@code FOR UPDATE}, so a dispute and
 * a confirmation arriving together are serialized instead of overwriting each other.
 */
@Service
public class AttendanceService {

    private final AttendanceRecordRepository records;
    private final InternshipManagementAuthorization authorization;
    private final InternshipPolicyResolver policyResolver;
    private final InternshipNotifier notifier;
    private final AuditService audit;

    public AttendanceService(
            AttendanceRecordRepository records, InternshipManagementAuthorization authorization,
            InternshipPolicyResolver policyResolver, InternshipNotifier notifier, AuditService audit) {
        this.records = records;
        this.authorization = authorization;
        this.policyResolver = policyResolver;
        this.notifier = notifier;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- read

    @Transactional(readOnly = true)
    public List<AttendanceRecord> list(UUID actingUserId, UUID placementId) {
        authorization.requireWorkplaceReadAccess(actingUserId, placementId);
        return records.findByPlacementIdOrderByAttendanceDate(placementId);
    }

    // ---------------------------------------------------------------- supervisor commands

    /**
     * Records one day of attendance.
     *
     * <p>The date must fall inside the placement period. Without that check a supervisor could record
     * attendance for a day the internship was not running, which would then count towards a
     * completion requirement that is supposed to describe the internship itself.
     */
    @Transactional
    public AttendanceRecord record(
            UUID actingUserId, UUID placementId, LocalDate date, AttendanceValue value, String notes) {
        Placement placement =
                authorization.requireAssignedOrganizationSupervisorOnRunningPlacement(actingUserId, placementId);
        policyResolver.resolveAndFreeze(placement);
        requireWithinPlacement(placement, date);

        AttendanceRecord record = AttendanceRecord.record(placementId, date, value, actingUserId, notes);
        try {
            AttendanceRecord saved = records.saveAndFlush(record);
            audit.record("ATTENDANCE_RECORDED", actingUserId, null, null, metadata(saved));
            return saved;
        } catch (DataIntegrityViolationException e) {
            throw new ApiException("ATTENDANCE_ALREADY_RECORDED", HttpStatus.CONFLICT,
                    "Attendance for that date has already been recorded.");
        }
    }

    /** RECORDED to CONFIRMED. Idempotent — confirming an already-confirmed record changes nothing. */
    @Transactional
    public AttendanceRecord confirm(UUID actingUserId, UUID recordId, String ipAddress, String userAgent) {
        AttendanceRecord record = lockForSupervisor(actingUserId, recordId);
        if (record.getConfirmationStatus() == AttendanceConfirmationStatus.CONFIRMED) {
            return record;
        }
        record.confirm(actingUserId);
        records.save(record);

        audit.record("ATTENDANCE_CONFIRMED", actingUserId, ipAddress, userAgent, metadata(record));
        return record;
    }

    /**
     * DISPUTED to RESOLVED, optionally correcting the value.
     *
     * <p>The student's original dispute reason is preserved on its own field, so resolving a dispute
     * settles it without erasing the fact that it was raised or what it said
     * (CLAUDE.md section 51 — never silently overwrite meaningful history).
     */
    @Transactional
    public AttendanceRecord resolve(
            UUID actingUserId, UUID recordId, AttendanceValue correctedValue, String resolutionNote,
            String ipAddress, String userAgent) {
        AttendanceRecord record = lockForSupervisor(actingUserId, recordId);
        if (record.getConfirmationStatus() == AttendanceConfirmationStatus.RESOLVED) {
            return record;
        }
        record.resolve(actingUserId, correctedValue, resolutionNote);
        records.save(record);

        audit.record("ATTENDANCE_RESOLVED", actingUserId, ipAddress, userAgent, metadata(record));
        notifier.attendanceResolved(authorization.getOrThrow(record.getPlacementId()));
        return record;
    }

    // ---------------------------------------------------------------- student command

    /** RECORDED or CONFIRMED to DISPUTED, by the owning student only. */
    @Transactional
    public AttendanceRecord dispute(
            UUID studentUserId, UUID recordId, String reason, String ipAddress, String userAgent) {
        if (reason == null || reason.isBlank()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Explain why this attendance record is wrong.");
        }
        AttendanceRecord record = records.findByIdForUpdate(recordId).orElseThrow(this::notFound);
        Placement placement =
                authorization.requireOwningStudentOnRunningPlacement(studentUserId, record.getPlacementId());

        if (record.getConfirmationStatus() == AttendanceConfirmationStatus.DISPUTED) {
            return record;
        }
        record.dispute(studentUserId, reason);
        records.save(record);

        audit.record("ATTENDANCE_DISPUTED", studentUserId, ipAddress, userAgent, metadata(record));
        notifier.attendanceDisputed(placement);
        return record;
    }

    // ---------------------------------------------------------------- helpers

    private AttendanceRecord lockForSupervisor(UUID actingUserId, UUID recordId) {
        AttendanceRecord record = records.findByIdForUpdate(recordId).orElseThrow(this::notFound);
        authorization.requireAssignedOrganizationSupervisorOnRunningPlacement(actingUserId, record.getPlacementId());
        return record;
    }

    private void requireWithinPlacement(Placement placement, LocalDate date) {
        if (date.isBefore(placement.getStartDate()) || date.isAfter(placement.getEndDate())) {
            throw new ApiException("ATTENDANCE_DATE_OUT_OF_RANGE", HttpStatus.BAD_REQUEST,
                    "That date is outside this internship period.");
        }
    }

    private ApiException notFound() {
        return new ApiException("ATTENDANCE_NOT_FOUND", HttpStatus.NOT_FOUND, "Attendance record not found.");
    }

    /** Safe identifiers only — never the dispute reason or the supervisor's private note. */
    private String metadata(AttendanceRecord record) {
        return "attendanceId=" + record.getId()
                + ";placementId=" + record.getPlacementId()
                + ";date=" + record.getAttendanceDate()
                + ";value=" + record.getAttendanceValue()
                + ";status=" + record.getConfirmationStatus();
    }
}
