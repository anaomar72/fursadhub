package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.InternshipOffer;
import com.fursadhub.candidacy.domain.OfferStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaInternshipOfferRepository extends JpaRepository<InternshipOffer, UUID> {

    /**
     * SELECT ... FOR UPDATE on the offer row. This is what serializes concurrent/double-clicked
     * offer acceptances so exactly one placement can ever be created (CLAUDE.md section 38/54).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM InternshipOffer o WHERE o.id = :id")
    Optional<InternshipOffer> findByIdForUpdate(@Param("id") UUID id);

    Optional<InternshipOffer> findByCandidacyIdAndStatusIn(UUID candidacyId, List<OfferStatus> statuses);

    List<InternshipOffer> findByCandidacyIdOrderByCreatedAtDesc(UUID candidacyId);

    List<InternshipOffer> findByCandidacyIdIn(List<UUID> candidacyIds);
}
