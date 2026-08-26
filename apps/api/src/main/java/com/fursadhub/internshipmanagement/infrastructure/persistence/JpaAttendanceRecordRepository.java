package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.AttendanceRecord;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaAttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM AttendanceRecord a WHERE a.id = :id")
    Optional<AttendanceRecord> findByIdForUpdate(@Param("id") UUID id);

    List<AttendanceRecord> findByPlacementIdOrderByAttendanceDateAsc(UUID placementId);

    long countByPlacementId(UUID placementId);

    /**
     * Attendance still awaiting someone's action. Mirrors the partial index
     * {@code idx_attendance_unsettled} and is the whole attendance completion rule.
     */
    @Query("SELECT count(a) FROM AttendanceRecord a WHERE a.placementId = :placementId "
            + "AND a.confirmationStatus IN (com.fursadhub.internshipmanagement.domain.AttendanceConfirmationStatus.RECORDED, "
            + "com.fursadhub.internshipmanagement.domain.AttendanceConfirmationStatus.DISPUTED)")
    long countUnsettled(@Param("placementId") UUID placementId);
}
