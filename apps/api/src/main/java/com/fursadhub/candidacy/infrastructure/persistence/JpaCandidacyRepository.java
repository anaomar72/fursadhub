package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.Candidacy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaCandidacyRepository extends JpaRepository<Candidacy, UUID> {

    Optional<Candidacy> findByOpportunityIdAndStudentUserId(UUID opportunityId, UUID studentUserId);

    List<Candidacy> findByOpportunityIdOrderByCreatedAtDesc(UUID opportunityId);

    List<Candidacy> findByStudentUserIdOrderByCreatedAtDesc(UUID studentUserId);
}
