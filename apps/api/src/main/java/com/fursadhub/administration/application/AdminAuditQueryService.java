package com.fursadhub.administration.application;

import com.fursadhub.common.audit.AuditEvent;
import com.fursadhub.common.audit.AuditEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read-only access to the audit trail (Phase 7 "Admin: audit viewing").
 *
 * <p>SUPER_ADMIN only, and read-only in the strongest sense: this service exposes no way to write,
 * edit or delete an audit event, and neither does anything else in FursadHub. The trail is
 * append-only (CLAUDE.md section 51) — a trail an administrator could tidy up would be worthless
 * precisely when it mattered.
 *
 * <p>The events themselves are already safe to read: FursadHub never writes passwords, tokens,
 * Authorization headers, storage keys or document content into audit metadata (CLAUDE.md section 68),
 * so there is nothing here to redact on the way out.
 */
@Service
public class AdminAuditQueryService {

    private final PlatformAuthorization authorization;
    private final AuditEventRepository auditEvents;

    public AdminAuditQueryService(PlatformAuthorization authorization, AuditEventRepository auditEvents) {
        this.authorization = authorization;
        this.auditEvents = auditEvents;
    }

    @Transactional(readOnly = true)
    public Page<AuditEvent> search(
            UUID actingUserId, String eventType, UUID userId, Instant from, Instant to, Pageable pageable) {
        authorization.requireSuperAdmin(actingUserId);
        String type = (eventType == null || eventType.isBlank()) ? null : eventType.trim();
        return auditEvents.search(type, userId, from, to, pageable);
    }

    @Transactional(readOnly = true)
    public List<String> eventTypes(UUID actingUserId) {
        authorization.requireSuperAdmin(actingUserId);
        return auditEvents.findDistinctEventTypes();
    }
}
