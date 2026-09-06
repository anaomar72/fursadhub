package com.fursadhub.student.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.infrastructure.persistence.PublicOpportunityPredicates;
import com.fursadhub.student.domain.SavedOpportunity;
import com.fursadhub.student.domain.SavedOpportunityRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
class SavedOpportunityRepositoryAdapter implements SavedOpportunityRepository {

    private final JpaSavedOpportunityRepository jpaRepository;

    @PersistenceContext
    private EntityManager entityManager;

    SavedOpportunityRepositoryAdapter(JpaSavedOpportunityRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    /**
     * {@code REQUIRES_NEW} so a duplicate-key failure rolls back only this insert.
     *
     * <p>A constraint violation marks its transaction rollback-only, so if this shared the caller's
     * transaction, catching the exception would still fail at commit with
     * {@code UnexpectedRollbackException} — the classic way a "handled" race becomes a 500. Its own
     * transaction lets the caller treat the conflict as the no-op it is.
     *
     * <p>{@code saveAndFlush} so the violation surfaces here rather than at commit time.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void insert(SavedOpportunity bookmark) {
        jpaRepository.saveAndFlush(bookmark);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean exists(UUID studentUserId, UUID opportunityId) {
        return jpaRepository.existsByStudentUserIdAndOpportunityId(studentUserId, opportunityId);
    }

    @Override
    @Transactional
    public boolean delete(UUID studentUserId, UUID opportunityId) {
        return jpaRepository.deleteByStudentUserIdAndOpportunityId(studentUserId, opportunityId) > 0;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findSavedOpportunityIds(UUID studentUserId, Collection<UUID> opportunityIds) {
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            // An empty IN () is invalid SQL in PostgreSQL, and an empty request is legitimate.
            return List.of();
        }
        return jpaRepository.findSavedOpportunityIds(studentUserId, opportunityIds);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, SavedOpportunity> findAllByStudent(UUID studentUserId) {
        Map<UUID, SavedOpportunity> byOpportunity = new LinkedHashMap<>();
        jpaRepository.findByStudentUserId(studentUserId)
                .forEach(saved -> byOpportunity.put(saved.getOpportunityId(), saved));
        return byOpportunity;
    }

    /**
     * The saved list, constrained by the CANONICAL public-visibility predicate — the same
     * {@link PublicOpportunityPredicates#publiclyVisible} the public discovery query and the public
     * detail lookup use, not a copy of its terms. A student therefore cannot learn anything through
     * Saved Internships that {@code GET /api/v1/public/opportunities/{id}} would hide.
     *
     * <p>Rooted at the bookmark because the ordering key ({@code savedAt}) lives there, with the
     * opportunity brought in as a second root narrowed by an id equality. That is a join expressed
     * the only way available here: {@code opportunityId} is a plain UUID column, since this codebase
     * maps no JPA associations anywhere. PostgreSQL plans it as an inner join.
     *
     * <p>Count and content run the same predicate, which is what keeps {@code totalElements} honest:
     * it counts what the student can currently SEE, not what they have stored. Filtering a fetched
     * page in Java instead would produce short pages and totals that promise rows that never arrive.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<SavedOpportunityView> findVisibleByStudent(UUID studentUserId, Pageable pageable) {
        long total = countVisible(studentUserId);
        if (total == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<SavedOpportunityRow> query = cb.createQuery(SavedOpportunityRow.class);
        Root<SavedOpportunity> saved = query.from(SavedOpportunity.class);
        Root<InternshipOpportunity> opportunity = query.from(InternshipOpportunity.class);

        query.select(cb.construct(SavedOpportunityRow.class, saved.get("savedAt"), opportunity))
                .where(visibleSavedOf(studentUserId, saved, opportunity, query, cb))
                // Newest save first. The bookmark id is a deterministic tie-break so two rows saved
                // in the same instant cannot swap places between pages and skip or repeat an entry.
                .orderBy(cb.desc(saved.get("savedAt")), cb.desc(saved.get("id")));

        List<SavedOpportunityView> content = entityManager.createQuery(query)
                .setFirstResult((int) pageable.getOffset())
                .setMaxResults(pageable.getPageSize())
                .getResultList().stream()
                .map(row -> new SavedOpportunityView(row.savedAt(), row.opportunity()))
                .toList();

        return new PageImpl<>(content, pageable, total);
    }

    private long countVisible(UUID studentUserId) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<SavedOpportunity> saved = query.from(SavedOpportunity.class);
        Root<InternshipOpportunity> opportunity = query.from(InternshipOpportunity.class);

        query.select(cb.count(saved))
                .where(visibleSavedOf(studentUserId, saved, opportunity, query, cb));
        return entityManager.createQuery(query).getSingleResult();
    }

    private Predicate visibleSavedOf(
            UUID studentUserId, Root<SavedOpportunity> saved, Root<InternshipOpportunity> opportunity,
            CriteriaQuery<?> query, CriteriaBuilder cb) {
        return cb.and(
                cb.equal(saved.get("studentUserId"), studentUserId),
                cb.equal(opportunity.get("id"), saved.get("opportunityId")),
                PublicOpportunityPredicates.publiclyVisible(opportunity, query, cb));
    }

    /** Projection carrier; {@code cb.construct} needs a concrete type. */
    public record SavedOpportunityRow(Instant savedAt, InternshipOpportunity opportunity) {
    }
}
