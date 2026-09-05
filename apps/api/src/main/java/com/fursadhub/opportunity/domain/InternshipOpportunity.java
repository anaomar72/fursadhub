package com.fursadhub.opportunity.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One internship opportunity model spanning all three sourcing modes (CLAUDE.md section 2/32) —
 * deliberately not split into {@code PublicInternship}/{@code TargetedInternship}/{@code
 * HybridInternship} subtypes. State transitions ({@link #publish()}, {@link #pause()}, {@link
 * #resume()}, {@link #close()}, {@link #cancel()}) are centralized here rather than allowing
 * arbitrary status mutation (CLAUDE.md section 33).
 */
@Entity
@Table(name = "internship_opportunities")
public class InternshipOpportunity {

    /** Weekly commitment bounds (Backend Phase B3); mirrored by a CHECK constraint in V43. */
    public static final int MIN_HOURS_PER_WEEK = 1;
    public static final int MAX_HOURS_PER_WEEK = 80;

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 4000)
    private String description;

    @Column(length = 4000)
    private String responsibilities;

    @Column(length = 4000)
    private String requirements;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OpportunityMode mode;

    @Column(name = "number_of_openings", nullable = false)
    private int numberOfOpenings;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_mode", nullable = false, length = 20)
    private WorkMode workMode;

    @Column(length = 255)
    private String location;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    // ---------------------------------------------------------------- Backend Phase B3
    // All optional and all additive. Compensation is stored as its five components rather than an
    // @Embeddable because the codebase maps no embeddables or associations anywhere; the components
    // are assembled into a Compensation value object on read (getCompensation) and validated as one
    // on write, so the invariants still live in a single place.

    @Enumerated(EnumType.STRING)
    @Column(name = "compensation_type", length = 20)
    private CompensationType compensationType;

    @Column(name = "compensation_currency", length = 3)
    private String compensationCurrency;

    @Column(name = "compensation_min_amount", precision = 12, scale = 2)
    private BigDecimal compensationMinAmount;

    @Column(name = "compensation_max_amount", precision = 12, scale = 2)
    private BigDecimal compensationMaxAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "compensation_period", length = 10)
    private CompensationPeriod compensationPeriod;

    /**
     * Weekly time commitment. Genuinely new information: {@code startDate}/{@code endDate} give the
     * internship's DURATION and {@code workMode} gives its LOCATION, but neither says whether it
     * asks for eight hours a week or forty.
     */
    @Column(name = "hours_per_week")
    private Integer hoursPerWeek;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OpportunityStatus status;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected InternshipOpportunity() {
    }

    public static InternshipOpportunity draft(
            UUID organizationId, String title, String description, String responsibilities, String requirements,
            OpportunityMode mode, int numberOfOpenings, WorkMode workMode, String location, LocalDate startDate,
            LocalDate endDate, LocalDate applicationDeadline, UUID createdBy) {
        InternshipOpportunity opportunity = new InternshipOpportunity();
        opportunity.id = UUID.randomUUID();
        opportunity.organizationId = organizationId;
        opportunity.status = OpportunityStatus.DRAFT;
        opportunity.createdBy = createdBy;
        opportunity.createdAt = Instant.now();
        opportunity.updatedAt = Instant.now();
        opportunity.applyEdits(title, description, responsibilities, requirements, mode, numberOfOpenings, workMode,
                location, startDate, endDate, applicationDeadline);
        return opportunity;
    }

    /** Editing is restricted to {@code DRAFT} opportunities — published state changes go through explicit commands. */
    public void applyEdits(
            String title, String description, String responsibilities, String requirements, OpportunityMode mode,
            int numberOfOpenings, WorkMode workMode, String location, LocalDate startDate, LocalDate endDate,
            LocalDate applicationDeadline) {
        if (status != null && status != OpportunityStatus.DRAFT) {
            throw new ApiException("OPPORTUNITY_NOT_EDITABLE", HttpStatus.CONFLICT,
                    "Only a draft opportunity can be edited.");
        }
        this.title = title;
        this.description = description;
        this.responsibilities = responsibilities;
        this.requirements = requirements;
        this.mode = mode;
        this.numberOfOpenings = numberOfOpenings;
        this.workMode = workMode;
        this.location = location;
        this.startDate = startDate;
        this.endDate = endDate;
        this.applicationDeadline = applicationDeadline;
        this.updatedAt = Instant.now();
    }

    /**
     * Applies the optional enrichment Backend Phase B3 added: what the internship pays, and how many
     * hours a week it asks for.
     *
     * <p>Separate from {@link #applyEdits} rather than lengthening its parameter list, which already
     * carries eleven positional arguments. Adding two more — one of them nullable — is how a
     * transposed call site compiles cleanly and stores the wrong thing.
     *
     * <p>Subject to the same DRAFT-only rule: enrichment is opportunity content, so a published
     * opportunity cannot have its pay quietly rewritten under applicants who already read it.
     *
     * @param compensation the validated value object, or null when the organization has said nothing
     *                     about pay — which is NOT the same as saying the internship is UNPAID
     * @param hoursPerWeek validated by {@link #validateHoursPerWeek}
     */
    public void applyEnrichment(Compensation compensation, Integer hoursPerWeek) {
        requireDraft();
        validateHoursPerWeek(hoursPerWeek);

        this.compensationType = compensation == null ? null : compensation.type();
        this.compensationCurrency = compensation == null ? null : compensation.currencyCode();
        this.compensationMinAmount = compensation == null ? null : compensation.minimumAmount();
        this.compensationMaxAmount = compensation == null ? null : compensation.maximumAmount();
        this.compensationPeriod = compensation == null ? null : compensation.period();
        this.hoursPerWeek = hoursPerWeek;
        this.updatedAt = Instant.now();
    }

    /**
     * Positive, and bounded well below the 168 hours a week contains. The upper bound exists to
     * reject nonsense (a typo of 400, a value entered in minutes), not to police how demanding an
     * internship may be, so it is deliberately generous rather than set at a notional full week.
     */
    private static void validateHoursPerWeek(Integer hoursPerWeek) {
        if (hoursPerWeek == null) {
            return;
        }
        if (hoursPerWeek < MIN_HOURS_PER_WEEK || hoursPerWeek > MAX_HOURS_PER_WEEK) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Hours per week must be between " + MIN_HOURS_PER_WEEK + " and " + MAX_HOURS_PER_WEEK + ".");
        }
    }

    private void requireDraft() {
        if (status != null && status != OpportunityStatus.DRAFT) {
            throw new ApiException("OPPORTUNITY_NOT_EDITABLE", HttpStatus.CONFLICT,
                    "Only a draft opportunity can be edited.");
        }
    }

    /**
     * Reassembles the five stored columns into the value object. Null when no compensation type is
     * set, which is how "nothing said about pay" stays distinguishable from {@code UNPAID}.
     */
    public Compensation getCompensation() {
        if (compensationType == null) {
            return null;
        }
        return new Compensation(
                compensationType, compensationCurrency, compensationMinAmount, compensationMaxAmount, compensationPeriod);
    }

    public Integer getHoursPerWeek() {
        return hoursPerWeek;
    }

    public void publish() {
        if (status != OpportunityStatus.DRAFT) {
            throw invalidTransition();
        }
        this.status = OpportunityStatus.PUBLISHED;
        this.publishedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void pause() {
        if (status != OpportunityStatus.PUBLISHED) {
            throw invalidTransition();
        }
        this.status = OpportunityStatus.PAUSED;
        this.updatedAt = Instant.now();
    }

    public void resume() {
        if (status != OpportunityStatus.PAUSED) {
            throw invalidTransition();
        }
        this.status = OpportunityStatus.PUBLISHED;
        this.updatedAt = Instant.now();
    }

    public void close() {
        if (status != OpportunityStatus.PUBLISHED && status != OpportunityStatus.PAUSED) {
            throw invalidTransition();
        }
        this.status = OpportunityStatus.CLOSED;
        this.updatedAt = Instant.now();
    }

    public void cancel() {
        if (status == OpportunityStatus.CLOSED || status == OpportunityStatus.CANCELLED) {
            throw invalidTransition();
        }
        this.status = OpportunityStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    private ApiException invalidTransition() {
        return new ApiException("OPPORTUNITY_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This opportunity status change is not allowed from its current state.");
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getResponsibilities() {
        return responsibilities;
    }

    public String getRequirements() {
        return requirements;
    }

    public OpportunityMode getMode() {
        return mode;
    }

    public int getNumberOfOpenings() {
        return numberOfOpenings;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public String getLocation() {
        return location;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public LocalDate getApplicationDeadline() {
        return applicationDeadline;
    }

    public OpportunityStatus getStatus() {
        return status;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
