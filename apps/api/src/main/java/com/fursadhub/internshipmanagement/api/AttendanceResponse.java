package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.AttendanceRecord;

import java.time.Instant;

/** One attendance record as every authorized party renders it. */
public record AttendanceResponse(
        String id,
        String placementId,
        String attendanceDate,
        String attendanceValue,
        String confirmationStatus,
        String notes,
        String disputeReason,
        String resolutionNote,
        String confirmedAt,
        String disputedAt,
        String resolvedAt,
        String createdAt,
        String updatedAt) {

    public static AttendanceResponse from(AttendanceRecord record) {
        return new AttendanceResponse(
                record.getId().toString(),
                record.getPlacementId().toString(),
                record.getAttendanceDate().toString(),
                record.getAttendanceValue().name(),
                record.getConfirmationStatus().name(),
                record.getNotes(),
                record.getDisputeReason(),
                record.getResolutionNote(),
                text(record.getConfirmedAt()),
                text(record.getDisputedAt()),
                text(record.getResolvedAt()),
                record.getCreatedAt().toString(),
                record.getUpdatedAt().toString());
    }

    private static String text(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
