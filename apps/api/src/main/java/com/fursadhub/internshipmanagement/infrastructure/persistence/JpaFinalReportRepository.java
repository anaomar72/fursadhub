package com.fursadhub.internshipmanagement.infrastructure.persistence;

import com.fursadhub.internshipmanagement.domain.FinalReport;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

interface JpaFinalReportRepository extends JpaRepository<FinalReport, UUID> {

    Optional<FinalReport> findByPlacementId(UUID placementId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM FinalReport r WHERE r.placementId = :placementId")
    Optional<FinalReport> findByPlacementIdForUpdate(@Param("placementId") UUID placementId);
}
