package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.Nomination;
import com.fursadhub.candidacy.domain.NominationRepository;
import com.fursadhub.candidacy.domain.NominationStatus;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class NominationRepositoryAdapter implements NominationRepository {

    /** "Live" mirrors the partial unique index in V19: pending consent, or already accepted. */
    private static final List<NominationStatus> LIVE_STATUSES =
            List.of(NominationStatus.PENDING_STUDENT_CONSENT, NominationStatus.ACCEPTED);

    private final JpaNominationRepository jpaRepository;

    NominationRepositoryAdapter(JpaNominationRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Nomination save(Nomination nomination) {
        return jpaRepository.save(nomination);
    }

    @Override
    public Optional<Nomination> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Nomination> findByStudentUserId(UUID studentUserId) {
        return jpaRepository.findByStudentUserIdOrderByCreatedAtDesc(studentUserId);
    }

    @Override
    public List<Nomination> findByUniversityId(UUID universityId) {
        return jpaRepository.findByUniversityIdOrderByCreatedAtDesc(universityId);
    }

    @Override
    public List<Nomination> findByUniversityIdAndDepartmentIdIn(UUID universityId, List<UUID> departmentIds) {
        return departmentIds.isEmpty()
                ? List.of()
                : jpaRepository.findByUniversityIdAndDepartmentIdInOrderByCreatedAtDesc(universityId, departmentIds);
    }

    @Override
    public List<Nomination> findByOpportunityId(UUID opportunityId) {
        return jpaRepository.findByOpportunityIdOrderByCreatedAtDesc(opportunityId);
    }

    @Override
    public int countLiveByOpportunityTargetId(UUID opportunityTargetId) {
        return jpaRepository.countByOpportunityTargetIdAndStatusIn(opportunityTargetId, LIVE_STATUSES);
    }

    @Override
    public boolean existsLiveByOpportunityIdAndStudentUserId(UUID opportunityId, UUID studentUserId) {
        return jpaRepository.existsByOpportunityIdAndStudentUserIdAndStatusIn(opportunityId, studentUserId, LIVE_STATUSES);
    }
}
