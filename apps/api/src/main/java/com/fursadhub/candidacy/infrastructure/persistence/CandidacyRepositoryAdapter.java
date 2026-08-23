package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class CandidacyRepositoryAdapter implements CandidacyRepository {

    private final JpaCandidacyRepository jpaRepository;

    @PersistenceContext
    private EntityManager entityManager;

    CandidacyRepositoryAdapter(JpaCandidacyRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Candidacy save(Candidacy candidacy) {
        return jpaRepository.save(candidacy);
    }

    @Override
    public Optional<Candidacy> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<Candidacy> findByOpportunityIdAndStudentUserId(UUID opportunityId, UUID studentUserId) {
        return jpaRepository.findByOpportunityIdAndStudentUserId(opportunityId, studentUserId);
    }

    @Override
    public List<Candidacy> findByOpportunityId(UUID opportunityId) {
        return jpaRepository.findByOpportunityIdOrderByCreatedAtDesc(opportunityId);
    }

    @Override
    public List<Candidacy> findByStudentUserId(UUID studentUserId) {
        return jpaRepository.findByStudentUserIdOrderByCreatedAtDesc(studentUserId);
    }

    /**
     * Takes a PostgreSQL transaction-scoped advisory lock keyed on the (opportunity, student) pair.
     *
     * <p>This is the core of the candidacy merge strategy (CLAUDE.md section 36/54). A
     * self-application and a nomination acceptance for the same pair can arrive concurrently; a
     * plain "check if exists, then insert" lets both transactions read "no candidacy" and both try
     * to insert, so one fails on the unique constraint and the user sees a spurious error. Holding
     * this lock first serializes exactly that pair — the second transaction waits, then observes the
     * candidacy the first one created and merges the source to BOTH instead of inserting.
     *
     * <p>{@code pg_advisory_xact_lock} is released automatically on commit OR rollback, so no
     * cleanup path can leak it. The two-int form is used with the UUIDs' hash codes: a hash
     * collision between unrelated pairs only causes harmless extra serialization, never incorrect
     * behaviour, and the {@code UNIQUE(opportunity_id, student_user_id)} constraint remains the
     * final backstop regardless (CLAUDE.md section 52).
     */
    @Override
    public void lockCandidacySlot(UUID opportunityId, UUID studentUserId) {
        entityManager
                .createNativeQuery("SELECT pg_advisory_xact_lock(CAST(:first AS int), CAST(:second AS int))")
                .setParameter("first", opportunityId.hashCode())
                .setParameter("second", studentUserId.hashCode())
                .getSingleResult();
    }
}
