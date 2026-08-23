package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.CandidacyEventRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
class CandidacyEventRepositoryAdapter implements CandidacyEventRepository {

    private final JpaCandidacyEventRepository jpaRepository;

    CandidacyEventRepositoryAdapter(JpaCandidacyEventRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public CandidacyEvent save(CandidacyEvent event) {
        return jpaRepository.save(event);
    }

    @Override
    public List<CandidacyEvent> findByCandidacyIdOrderByOccurredAt(UUID candidacyId) {
        return jpaRepository.findByCandidacyIdOrderByOccurredAtAsc(candidacyId);
    }
}
