package com.fursadhub.internshipmanagement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

/**
 * Controlled internship-completion configuration (CLAUDE.md section 41).
 *
 * <p>Five booleans. That is the entire model, and it is intentional: FursadHub must not grow a
 * workflow engine, a rules DSL or a dynamic requirement builder, so the requirements are columns
 * rather than rows, and adding a sixth would take a migration and a code review.
 *
 * <p>A row with a null {@code departmentId} is the university-wide default; a row carrying a
 * department is that department's override. There are exactly these two levels — see
 * {@code InternshipPolicyResolver} for the precedence.
 */
@Entity
@Table(name = "internship_policies")
public class InternshipPolicy {

    @Id
    private UUID id;

    @Column(name = "university_id", nullable = false)
    private UUID universityId;

    /** Null means "the university-wide default"; a value means "this department only". */
    @Column(name = "department_id")
    private UUID departmentId;

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

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected InternshipPolicy() {
    }

    public static InternshipPolicy create(UUID universityId, UUID departmentId, UUID updatedBy) {
        Instant now = Instant.now();
        InternshipPolicy policy = new InternshipPolicy();
        policy.id = UUID.randomUUID();
        policy.universityId = universityId;
        policy.departmentId = departmentId;
        policy.updatedBy = updatedBy;
        policy.createdAt = now;
        policy.updatedAt = now;
        return policy;
    }

    /**
     * Replaces all five requirements at once.
     *
     * <p>Editing a policy never rewrites history: placements freeze their resolved requirements in a
     * {@link PlacementPolicySnapshot} the first time Phase 6 touches them, so turning a requirement
     * on today cannot retroactively make a finished internship look incomplete.
     */
    public void update(
            boolean weeklyLogsRequired, boolean attendanceRequired, boolean organizationEvaluationRequired,
            boolean finalReportRequired, boolean defenseRequired, UUID updatedBy) {
        this.weeklyLogsRequired = weeklyLogsRequired;
        this.attendanceRequired = attendanceRequired;
        this.organizationEvaluationRequired = organizationEvaluationRequired;
        this.finalReportRequired = finalReportRequired;
        this.defenseRequired = defenseRequired;
        this.updatedBy = updatedBy;
        this.updatedAt = Instant.now();
    }

    public ResolvedInternshipPolicy resolvedAs(PolicySource source) {
        return new ResolvedInternshipPolicy(
                weeklyLogsRequired, attendanceRequired, organizationEvaluationRequired,
                finalReportRequired, defenseRequired, source, id);
    }

    public UUID getId() {
        return id;
    }

    public UUID getUniversityId() {
        return universityId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public boolean isWeeklyLogsRequired() {
        return weeklyLogsRequired;
    }

    public boolean isAttendanceRequired() {
        return attendanceRequired;
    }

    public boolean isOrganizationEvaluationRequired() {
        return organizationEvaluationRequired;
    }

    public boolean isFinalReportRequired() {
        return finalReportRequired;
    }

    public boolean isDefenseRequired() {
        return defenseRequired;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }
}
