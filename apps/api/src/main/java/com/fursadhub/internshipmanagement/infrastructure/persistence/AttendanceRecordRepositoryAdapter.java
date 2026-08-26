package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.AttendanceRecord;
import com.fursadhub.internshipmanagement.domain.AttendanceRecordRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class AttendanceRecordRepositoryAdapter implements AttendanceRecordRepository {

    private final JpaAttendanceRecordRepository jpaRepository;

    AttendanceRecordRepositoryAdapter(JpaAttendanceRecordRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public AttendanceRecord save(AttendanceRecord record) {
        return jpaRepository.save(record);
    }

    @Override
    public AttendanceRecord saveAndFlush(AttendanceRecord record) {
        return jpaRepository.saveAndFlush(record);
    }

    @Override
    public Optional<AttendanceRecord> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<AttendanceRecord> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id);
    }

    @Override
    public List<AttendanceRecord> findByPlacementIdOrderByAttendanceDate(UUID placementId) {
        return jpaRepository.findByPlacementIdOrderByAttendanceDateAsc(placementId);
    }

    @Override
    public long countByPlacementId(UUID placementId) {
        return jpaRepository.countByPlacementId(placementId);
    }

    @Override
    public long countUnsettledByPlacementId(UUID placementId) {
        return jpaRepository.countUnsettled(placementId);
    }
}
