package com.fursadhub.common.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    /**
     * Paged, filtered audit search for the Phase 7 admin console (Phase 7 "Admin: audit viewing").
     *
     * <p>Every filter is optional and null-tolerant, so one query serves "everything recently",
     * "everything about this account", and "every login failure since Tuesday". Paged rather than
     * list-returning because this table only ever grows and must never be loaded whole.
     *
     * <p>Read-only by design: there is no update or delete path to audit_events anywhere in
     * FursadHub. The trail is append-only (CLAUDE.md section 51), which is the entire point.
     */
    @Query("""
            SELECT e FROM AuditEvent e
            WHERE (:eventType IS NULL OR e.eventType = :eventType)
              AND (:userId IS NULL OR e.userId = :userId)
              AND (:from IS NULL OR e.occurredAt >= :from)
              AND (:to IS NULL OR e.occurredAt <= :to)
            ORDER BY e.occurredAt DESC
            """)
    Page<AuditEvent> search(
            @Param("eventType") String eventType,
            @Param("userId") UUID userId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    /** Distinct event types actually present, so the console's filter offers only real options. */
    @Query("SELECT DISTINCT e.eventType FROM AuditEvent e ORDER BY e.eventType ASC")
    List<String> findDistinctEventTypes();

    long countByEventTypeAndOccurredAtAfter(String eventType, Instant after);
}
