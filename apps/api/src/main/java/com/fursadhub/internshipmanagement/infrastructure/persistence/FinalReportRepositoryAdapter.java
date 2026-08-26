package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.FinalReport;
import com.fursadhub.internshipmanagement.domain.FinalReportRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class FinalReportRepositoryAdapter implements FinalReportRepository {

    private final JpaFinalReportRepository jpaRepository;

    FinalReportRepositoryAdapter(JpaFinalReportRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public FinalReport save(FinalReport report) {
        return jpaRepository.save(report);
    }

    @Override
    public FinalReport saveAndFlush(FinalReport report) {
        return jpaRepository.saveAndFlush(report);
    }

    @Override
    public Optional<FinalReport> findByPlacementId(UUID placementId) {
        return jpaRepository.findByPlacementId(placementId);
    }

    @Override
    public Optional<FinalReport> findByPlacementIdForUpdate(UUID placementId) {
        return jpaRepository.findByPlacementIdForUpdate(placementId);
    }
}
