package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.CandidacyEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaCandidacyEventRepository extends JpaRepository<CandidacyEvent, UUID> {

    List<CandidacyEvent> findByCandidacyIdOrderByOccurredAtAsc(UUID candidacyId);
}
