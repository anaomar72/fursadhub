package com.fursadhub.common.audit;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID>, JpaSpecificationExecutor<AuditEvent> {

    /**
     * Paged, filtered audit search for the Phase 7 admin console (Phase 7 "Admin: audit viewing").
     *
     * <p>Every filter is optional, so one query serves "everything recently", "everything about this
     * account", and "every login failure since Tuesday". Paged rather than list-returning because
     * this table only ever grows and must never be loaded whole.
     *
     * <p>Built as a {@link Specification} that simply OMITS an absent filter, rather than the
     * previous {@code (:param IS NULL OR column = :param)} JPQL. That form sends an untyped NULL
     * bind, and PostgreSQL cannot infer a type for a parameter whose only use is {@code ? is null}
     * — it failed outright with {@code could not determine data type of parameter $5}, so the whole
     * audit console returned 500 no matter which filters were set. Omitting the predicate also
     * lets the planner use the occurred_at/event_type indexes instead of evaluating a disjunction
     * per row.
     *
     * <p>Read-only by design: there is no update or delete path to audit_events anywhere in
     * FursadHub. The trail is append-only (CLAUDE.md section 51), which is the entire point.
     */
    default Page<AuditEvent> search(String eventType, UUID userId, Instant from, Instant to, Pageable pageable) {
        Specification<AuditEvent> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (eventType != null) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (userId != null) {
                predicates.add(cb.equal(root.get("userId"), userId));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), to));
            }
            // Newest first, matching the console's reading order. Skipped on the COUNT query, which
            // Spring Data derives from the same Specification and where ordering is meaningless.
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                query.orderBy(cb.desc(root.get("occurredAt")));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(Predicate[]::new));
        };
        return findAll(spec, pageable);
    }

    /** Distinct event types actually present, so the console's filter offers only real options. */
    @Query("SELECT DISTINCT e.eventType FROM AuditEvent e ORDER BY e.eventType ASC")
    List<String> findDistinctEventTypes();

    long countByEventTypeAndOccurredAtAfter(String eventType, Instant after);
}
