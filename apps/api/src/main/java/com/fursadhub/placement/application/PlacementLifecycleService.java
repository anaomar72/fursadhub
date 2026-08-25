package com.fursadhub.placement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The placement lifecycle commands (CLAUDE.md section 39, Phase 5 sections 15-18).
 *
 * <p>These commands never create a placement — that happens exactly once, in the Phase 4
 * offer-acceptance transaction. They only move the existing row through its frozen state machine,
 * and the machine itself lives on {@link Placement} rather than being scattered across these methods
 * or the controller.
 *
 * <p><strong>Concurrency.</strong> Every command opens by reading the placement {@code FOR UPDATE},
 * so two simultaneous starts (or a double-clicked cancel) are serialized by PostgreSQL: the second
 * transaction blocks until the first commits and then observes the state the first one produced.
 * Combined with the idempotent short-circuits below, a repeated command is a safe no-op instead of a
 * duplicate side effect or a confusing error (CLAUDE.md section 54).
 *
 * <p><strong>Student availability.</strong> There is no availability flag to update: Phase 4 derives
 * availability from a placement being live, enforced by the partial unique index
 * {@code uk_placements_one_live_per_student}. Moving a placement to CANCELLED, TERMINATED or
 * COMPLETED therefore releases the student automatically, inside this same transaction, with no
 * parallel bookkeeping that could drift out of sync (CLAUDE.md section 20/38).
 */
@Service
public class PlacementLifecycleService {

    private final PlacementRepository placements;
    private final PlacementAuthorization authorization;
    private final AuditService audit;

    public PlacementLifecycleService(
            PlacementRepository placements, PlacementAuthorization authorization, AuditService audit) {
        this.placements = placements;
        this.authorization = authorization;
        this.audit = audit;
    }

    /**
     * PLANNED to ACTIVE (Phase 5 section 15). The internship has actually begun.
     *
     * <p>Repeating this on an already ACTIVE placement returns it unchanged rather than failing, so
     * a retried request is harmless; every other state (including CANCELLED) is rejected by the
     * domain transition table.
     */
    @Transactional
    public Placement start(UUID actingUserId, UUID placementId, String ipAddress, String userAgent) {
        Placement placement = lockAndAuthorize(actingUserId, placementId);

        if (placement.getStatus() == PlacementStatus.ACTIVE) {
            return placement;
        }

        placement.start();
        placements.save(placement);

        audit.record("PLACEMENT_STARTED", actingUserId, ipAddress, userAgent, metadata(placement));
        return placement;
    }

    /**
     * PLANNED to CANCELLED (Phase 5 section 16) — for a placement that never properly started.
     * A placement that has already begun cannot be cancelled; the domain rejects it, and the caller
     * must terminate instead. The two are not interchangeable.
     */
    @Transactional
    public Placement cancel(UUID actingUserId, UUID placementId, String reason, String ipAddress, String userAgent) {
        Placement placement = lockAndAuthorize(actingUserId, placementId);

        if (placement.getStatus() == PlacementStatus.CANCELLED) {
            return placement;
        }

        placement.cancel(reason);
        placements.save(placement);

        audit.record("PLACEMENT_CANCELLED", actingUserId, ipAddress, userAgent, metadata(placement));
        return placement;
    }

    /**
     * ACTIVE or COMPLETION_PENDING to TERMINATED (Phase 5 section 17) — the internship started and
     * then ended early. The placement row is never deleted; it keeps its full history and its
     * academic context.
     */
    @Transactional
    public Placement terminate(UUID actingUserId, UUID placementId, String reason, String ipAddress, String userAgent) {
        Placement placement = lockAndAuthorize(actingUserId, placementId);

        if (placement.getStatus() == PlacementStatus.TERMINATED) {
            return placement;
        }

        placement.terminate(reason);
        placements.save(placement);

        audit.record("PLACEMENT_TERMINATED", actingUserId, ipAddress, userAgent, metadata(placement));
        return placement;
    }

    /**
     * ACTIVE to COMPLETION_PENDING (Phase 5 section 18).
     *
     * <p>Phase 5 establishes this transition only. It deliberately does NOT evaluate weekly logs,
     * attendance, evaluations, final reports or defense — those requirements and the COMPLETED
     * transition they gate are Phase 6 InternshipPolicy work. Requesting completion twice is a safe
     * no-op.
     */
    @Transactional
    public Placement requestCompletion(UUID actingUserId, UUID placementId, String ipAddress, String userAgent) {
        Placement placement = lockAndAuthorize(actingUserId, placementId);

        if (placement.getStatus() == PlacementStatus.COMPLETION_PENDING) {
            return placement;
        }

        placement.requestCompletion();
        placements.save(placement);

        audit.record("PLACEMENT_COMPLETION_REQUESTED", actingUserId, ipAddress, userAgent, metadata(placement));
        return placement;
    }

    /**
     * Locks the row, then authorizes — in that order, so the authorization decision cannot be made
     * against a placement another transaction is concurrently moving.
     *
     * <p>The lifecycle belongs to the organization hosting the internship: it is the party that
     * knows whether the student actually started, stopped, or finished. University staff read these
     * placements and own the university supervisor, but do not drive the lifecycle in Phase 5.
     */
    private Placement lockAndAuthorize(UUID actingUserId, UUID placementId) {
        Placement placement = placements.findByIdForUpdate(placementId)
                .orElseThrow(() -> new ApiException(
                        "PLACEMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "Placement not found."));

        // Re-uses the shared boundary so lifecycle and read access can never drift apart.
        authorization.requireOrganizationManage(actingUserId, placement.getId());
        return placement;
    }

    private String metadata(Placement placement) {
        return "placementId=" + placement.getId()
                + ";candidacyId=" + placement.getCandidacyId()
                + ";status=" + placement.getStatus();
    }
}
