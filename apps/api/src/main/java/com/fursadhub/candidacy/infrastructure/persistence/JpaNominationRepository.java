package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.Nomination;
import com.fursadhub.candidacy.domain.NominationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaNominationRepository extends JpaRepository<Nomination, UUID> {

    List<Nomination> findByStudentUserIdOrderByCreatedAtDesc(UUID studentUserId);

    List<Nomination> findByUniversityIdOrderByCreatedAtDesc(UUID universityId);

    List<Nomination> findByUniversityIdAndDepartmentIdInOrderByCreatedAtDesc(UUID universityId, List<UUID> departmentIds);

    List<Nomination> findByOpportunityIdOrderByCreatedAtDesc(UUID opportunityId);

    int countByOpportunityTargetIdAndStatusIn(UUID opportunityTargetId, List<NominationStatus> statuses);

    boolean existsByOpportunityIdAndStudentUserIdAndStatusIn(
            UUID opportunityId, UUID studentUserId, List<NominationStatus> statuses);
}
