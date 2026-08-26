package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The frozen attendance confirmation state machine (CLAUDE.md section 43). */
class AttendanceRecordTest {

    private static final UUID PLACEMENT = UUID.randomUUID();
    private static final UUID SUPERVISOR = UUID.randomUUID();
    private static final UUID STUDENT = UUID.randomUUID();

    private AttendanceRecord recorded() {
        return AttendanceRecord.record(
                PLACEMENT, LocalDate.of(2026, 3, 3), AttendanceValue.PRESENT, SUPERVISOR, "On site all day.");
    }

    @Test
    void aNewRecordStartsAsRecordedAndUnsettled() {
        AttendanceRecord record = recorded();

        assertThat(record.getConfirmationStatus()).isEqualTo(AttendanceConfirmationStatus.RECORDED);
        assertThat(record.isSettled()).isFalse();
    }

    @Test
    void recordedCanBeConfirmed() {
        AttendanceRecord record = recorded();

        record.confirm(SUPERVISOR);

        assertThat(record.getConfirmationStatus()).isEqualTo(AttendanceConfirmationStatus.CONFIRMED);
        assertThat(record.getConfirmedBy()).isEqualTo(SUPERVISOR);
        assertThat(record.isSettled()).isTrue();
    }

    @Test
    void aStudentMayDisputeAnAlreadyConfirmedRecord() {
        // An error is often only noticed after confirmation; an unchallengeable record is not
        // acceptable, so CONFIRMED is deliberately still disputable.
        AttendanceRecord record = recorded();
        record.confirm(SUPERVISOR);

        record.dispute(STUDENT, "I was present but working off site.");

        assertThat(record.getConfirmationStatus()).isEqualTo(AttendanceConfirmationStatus.DISPUTED);
        assertThat(record.isSettled()).isFalse();
    }

    @Test
    void resolvingADisputePreservesTheStudentsOriginalReason() {
        AttendanceRecord record = recorded();
        record.dispute(STUDENT, "I was present but working off site.");

        record.resolve(SUPERVISOR, AttendanceValue.PRESENT, "Confirmed with the team lead.");

        assertThat(record.getConfirmationStatus()).isEqualTo(AttendanceConfirmationStatus.RESOLVED);
        assertThat(record.getAttendanceValue()).isEqualTo(AttendanceValue.PRESENT);
        assertThat(record.getResolutionNote()).isEqualTo("Confirmed with the team lead.");
        // The dispute is settled, not erased.
        assertThat(record.getDisputeReason()).isEqualTo("I was present but working off site.");
        assertThat(record.getDisputedBy()).isEqualTo(STUDENT);
        assertThat(record.isSettled()).isTrue();
    }

    @Test
    void aDisputeMayBeResolvedWithoutChangingTheValue() {
        AttendanceRecord record = AttendanceRecord.record(
                PLACEMENT, LocalDate.of(2026, 3, 3), AttendanceValue.ABSENT, SUPERVISOR, null);
        record.dispute(STUDENT, "I was there.");

        record.resolve(SUPERVISOR, null, "Attendance sheet shows otherwise.");

        assertThat(record.getAttendanceValue()).isEqualTo(AttendanceValue.ABSENT);
        assertThat(record.getConfirmationStatus()).isEqualTo(AttendanceConfirmationStatus.RESOLVED);
    }

    @Test
    void aRecordCannotBeResolvedWithoutBeingDisputed() {
        AttendanceRecord record = recorded();

        assertThatThrownBy(() -> record.resolve(SUPERVISOR, AttendanceValue.ABSENT, "Changed my mind."))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "ATTENDANCE_INVALID_TRANSITION");
    }

    @Test
    void aDisputedRecordCannotBeQuietlyConfirmedBackWithoutResolution() {
        AttendanceRecord record = recorded();
        record.dispute(STUDENT, "Wrong day.");

        assertThatThrownBy(() -> record.confirm(SUPERVISOR))
                .isInstanceOf(ApiException.class);
        assertThat(record.getConfirmationStatus()).isEqualTo(AttendanceConfirmationStatus.DISPUTED);
    }

    @Test
    void aResolvedRecordIsFinished() {
        AttendanceRecord record = recorded();
        record.dispute(STUDENT, "Wrong day.");
        record.resolve(SUPERVISOR, AttendanceValue.EXCUSED, "Agreed.");

        assertThatThrownBy(() -> record.dispute(STUDENT, "Still wrong."))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> record.confirm(SUPERVISOR))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void onlyConfirmedAndResolvedCountAsSettled() {
        assertThat(AttendanceConfirmationStatus.RECORDED.isSettled()).isFalse();
        assertThat(AttendanceConfirmationStatus.DISPUTED.isSettled()).isFalse();
        assertThat(AttendanceConfirmationStatus.CONFIRMED.isSettled()).isTrue();
        assertThat(AttendanceConfirmationStatus.RESOLVED.isSettled()).isTrue();
    }
}
