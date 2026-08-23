package com.fursadhub.candidacy.domain;

import java.util.List;
import java.util.UUID;

public interface CandidacyEventRepository {

    CandidacyEvent save(CandidacyEvent event);

    List<CandidacyEvent> findByCandidacyIdOrderByOccurredAt(UUID candidacyId);
}
