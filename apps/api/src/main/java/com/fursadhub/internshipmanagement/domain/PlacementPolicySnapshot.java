package com.fursadhub.internshipmanagement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * The completion requirements frozen onto one placement (Phase 6 historical-safety requirement).
 *
 * <p>Resolved ONCE, the first time any Phase 6 activity touches the placement, and never
 * recalculated. Without this, a university that enables {@code final_report_required} in 2027 would
 * retroactively make every 2026 placement look incomplete, and nobody could tell afterwards which
 * rules a given internship was actually completed under.
 *
 * <p>This is deliberately a snapshot rather than a policy-versioning system: no effective dating, no
 * version-history table, no "which version applied when" query surface. The five booleans that
 * governed this one placement live on this one row, which is the smallest thing that answers the
 * question.
 *
 * <p>Immutable after insert — there is no setter, and nothing in the module offers an update path.
 */
@Entity
@Table(name = "placement_policy_snapshots")
public class PlacementPolicySnapshot {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "weekly_logs_required", nullable = false)
    private boolean weeklyLogsRequired;

    @Column(name = "attendance_required", nullable = false)
    private boolean attendanceRequired;

    @Column(name = "organization_evaluation_required", nullable = false)
    private boolean organizationEvaluationRequired;

    @Column(name = "final_report_required", nullable = false)
    private boolean finalReportRequired;

    @Column(name = "defense_required", nullable = false)
    private boolean defenseRequired;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PolicySource source;

    @Column(name = "source_policy_id")
    private UUID sourcePolicyId;

    @Column(name = "resolved_at", nullable = false)
    private Instant resolvedAt;

    protected PlacementPolicySnapshot() {
    }

    public static PlacementPolicySnapshot freeze(UUID placementId, ResolvedInternshipPolicy resolved) {
        PlacementPolicySnapshot snapshot = new PlacementPolicySnapshot();
        snapshot.id = UUID.randomUUID();
        snapshot.placementId = placementId;
        snapshot.weeklyLogsRequired = resolved.weeklyLogsRequired();
        snapshot.attendanceRequired = resolved.attendanceRequired();
        snapshot.organizationEvaluationRequired = resolved.organizationEvaluationRequired();
        snapshot.finalReportRequired = resolved.finalReportRequired();
        snapshot.defenseRequired = resolved.defenseRequired();
        snapshot.source = resolved.source();
        snapshot.sourcePolicyId = resolved.sourcePolicyId();
        snapshot.resolvedAt = Instant.now();
        return snapshot;
    }

    public ResolvedInternshipPolicy toResolved() {
        return new ResolvedInternshipPolicy(
                weeklyLogsRequired, attendanceRequired, organizationEvaluationRequired,
                finalReportRequired, defenseRequired, source, sourcePolicyId);
    }

    public UUID getId() {
        return id;
    }

    public UUID getPlacementId() {
        return placementId;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }
}
