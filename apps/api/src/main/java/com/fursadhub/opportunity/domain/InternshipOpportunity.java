package com.fursadhub.opportunity.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

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
