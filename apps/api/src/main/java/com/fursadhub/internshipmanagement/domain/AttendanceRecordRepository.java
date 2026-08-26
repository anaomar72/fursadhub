package com.fursadhub.internshipmanagement.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRecordRepository {

    AttendanceRecord save(AttendanceRecord record);

    /** Immediate write, so a duplicate date is caught as ATTENDANCE_ALREADY_RECORDED at the call site. */
    AttendanceRecord saveAndFlush(AttendanceRecord record);

    Optional<AttendanceRecord> findById(UUID id);

    Optional<AttendanceRecord> findByIdForUpdate(UUID id);

    List<AttendanceRecord> findByPlacementIdOrderByAttendanceDate(UUID placementId);

    long countByPlacementId(UUID placementId);

    /** Records still awaiting someone's action — the attendance completion rule (Phase 6 section 22). */
    long countUnsettledByPlacementId(UUID placementId);
}
