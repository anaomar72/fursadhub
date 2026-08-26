package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.AttendanceValue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Recording one day of attendance.
 *
 * <p>A date, a value, and an optional note. There is deliberately no location, coordinate, device or
 * biometric field, and none may be added — V1 attendance is a human record (CLAUDE.md section 43).
 */
public record RecordAttendanceRequest(
        @NotNull LocalDate attendanceDate,
        @NotNull AttendanceValue attendanceValue,
        @Size(max = 1000) String notes) {
}
