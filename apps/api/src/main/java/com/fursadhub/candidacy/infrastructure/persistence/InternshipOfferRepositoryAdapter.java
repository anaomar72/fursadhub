package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.InternshipOffer;
import com.fursadhub.candidacy.domain.InternshipOfferRepository;
import com.fursadhub.candidacy.domain.OfferStatus;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class InternshipOfferRepositoryAdapter implements InternshipOfferRepository {

    /** "Live" mirrors the partial unique index in V21: awaiting response, or already accepted. */
    private static final List<OfferStatus> LIVE_STATUSES = List.of(OfferStatus.PENDING, OfferStatus.ACCEPTED);

    private final JpaInternshipOfferRepository jpaRepository;

    InternshipOfferRepositoryAdapter(JpaInternshipOfferRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public InternshipOffer save(InternshipOffer offer) {
        return jpaRepository.save(offer);
    }

    @Override
    public Optional<InternshipOffer> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<InternshipOffer> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id);
    }

    @Override
    public Optional<InternshipOffer> findLiveByCandidacyId(UUID candidacyId) {
        return jpaRepository.findByCandidacyIdAndStatusIn(candidacyId, LIVE_STATUSES);
    }

    @Override
    public List<InternshipOffer> findByCandidacyIdOrderByCreatedAtDesc(UUID candidacyId) {
        return jpaRepository.findByCandidacyIdOrderByCreatedAtDesc(candidacyId);
    }

    @Override
    public List<InternshipOffer> findByCandidacyIdIn(List<UUID> candidacyIds) {
        return candidacyIds.isEmpty() ? List.of() : jpaRepository.findByCandidacyIdIn(candidacyIds);
    }
}
