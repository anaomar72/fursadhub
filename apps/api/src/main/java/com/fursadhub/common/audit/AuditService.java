package com.fursadhub.common.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Records append-only audit events (CLAUDE.md section 51). Runs in its own transaction (joining
 * the caller's when one is active is fine, but callers may also invoke this after a caller's
 * transaction rolls back a business decision — e.g. a failed login must still be audited) so a
 * later failure elsewhere never silently drops security-relevant history.
 */
@Service
public class AuditService {

    private final AuditEventRepository repository;

    public AuditService(AuditEventRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String eventType, UUID userId, String ipAddress, String userAgent, String metadata) {
        repository.save(new AuditEvent(UUID.randomUUID(), Instant.now(), eventType, userId, ipAddress, userAgent, metadata));
    }
}
