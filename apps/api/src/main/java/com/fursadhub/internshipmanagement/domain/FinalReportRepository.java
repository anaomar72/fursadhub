package com.fursadhub.internshipmanagement.domain;

import java.util.Optional;
import java.util.UUID;

public interface FinalReportRepository {

    FinalReport save(FinalReport report);

    FinalReport saveAndFlush(FinalReport report);

    Optional<FinalReport> findByPlacementId(UUID placementId);

    /** SELECT ... FOR UPDATE, so concurrent approve/request-revision commands are serialized. */
    Optional<FinalReport> findByPlacementIdForUpdate(UUID placementId);
}
