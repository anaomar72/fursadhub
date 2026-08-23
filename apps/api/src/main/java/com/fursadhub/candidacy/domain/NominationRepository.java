package com.fursadhub.candidacy.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NominationRepository {

    Nomination save(Nomination nomination);

    Optional<Nomination> findById(UUID id);

    List<Nomination> findByStudentUserId(UUID studentUserId);

    List<Nomination> findByUniversityId(UUID universityId);

    List<Nomination> findByUniversityIdAndDepartmentIdIn(UUID universityId, List<UUID> departmentIds);

    List<Nomination> findByOpportunityId(UUID opportunityId);

    /** Counts live (pending or accepted) nominations against one target, for requested-nominee limits. */
    int countLiveByOpportunityTargetId(UUID opportunityTargetId);

    boolean existsLiveByOpportunityIdAndStudentUserId(UUID opportunityId, UUID studentUserId);
}
