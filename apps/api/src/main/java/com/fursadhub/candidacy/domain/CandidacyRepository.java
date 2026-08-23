package com.fursadhub.candidacy.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CandidacyRepository {

    Candidacy save(Candidacy candidacy);

    Optional<Candidacy> findById(UUID id);

    Optional<Candidacy> findByOpportunityIdAndStudentUserId(UUID opportunityId, UUID studentUserId);

    List<Candidacy> findByOpportunityId(UUID opportunityId);

    List<Candidacy> findByStudentUserId(UUID studentUserId);

    /**
     * Serializes concurrent work on one (opportunity, student) pair for the duration of the calling
     * transaction, so a self-application racing a nomination acceptance cannot both observe "no
     * candidacy exists" and both insert. Released automatically on commit or rollback.
     */
    void lockCandidacySlot(UUID opportunityId, UUID studentUserId);
}
