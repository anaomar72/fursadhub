package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.WeeklyLog;
import com.fursadhub.internshipmanagement.domain.WeeklyLogRepository;
import com.fursadhub.internshipmanagement.domain.WeeklyLogState;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class WeeklyLogRepositoryAdapter implements WeeklyLogRepository {

    private final JpaWeeklyLogRepository jpaRepository;

    WeeklyLogRepositoryAdapter(JpaWeeklyLogRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public WeeklyLog save(WeeklyLog log) {
        return jpaRepository.save(log);
    }

    @Override
    public WeeklyLog saveAndFlush(WeeklyLog log) {
        return jpaRepository.saveAndFlush(log);
    }

    @Override
    public Optional<WeeklyLog> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<WeeklyLog> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id);
    }

    @Override
    public List<WeeklyLog> findByPlacementIdOrderByWeekNumber(UUID placementId) {
        return jpaRepository.findByPlacementIdOrderByWeekNumberAsc(placementId);
    }

    @Override
    public long countByPlacementIdAndState(UUID placementId, WeeklyLogState state) {
        return jpaRepository.countByPlacementIdAndState(placementId, state);
    }
}
