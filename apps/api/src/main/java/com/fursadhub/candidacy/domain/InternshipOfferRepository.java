package com.fursadhub.candidacy.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternshipOfferRepository {

    InternshipOffer save(InternshipOffer offer);

    Optional<InternshipOffer> findById(UUID id);

    /**
     * Reads the offer under a pessimistic write lock. This is what makes offer acceptance
     * idempotent: a second concurrent/double-clicked accept blocks here until the first commits,
     * then observes the already-ACCEPTED offer instead of racing to create a second placement.
     */
    Optional<InternshipOffer> findByIdForUpdate(UUID id);

    Optional<InternshipOffer> findLiveByCandidacyId(UUID candidacyId);

    List<InternshipOffer> findByCandidacyIdOrderByCreatedAtDesc(UUID candidacyId);

    List<InternshipOffer> findByCandidacyIdIn(List<UUID> candidacyIds);
}
