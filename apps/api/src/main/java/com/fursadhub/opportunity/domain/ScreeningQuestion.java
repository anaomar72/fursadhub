package com.fursadhub.opportunity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One screening question attached to an opportunity (CLAUDE.md Phase 4 section 9). At most
 * {@link #MAX_QUESTIONS_PER_OPPORTUNITY} exist per opportunity; {@code position} is 0-based and
 * unique per opportunity, which is what lets the database cap the count via a CHECK on the range
 * (see V18) rather than relying on the service layer alone.
 */
@Entity
@Table(name = "screening_questions")
public class ScreeningQuestion {

    public static final int MAX_QUESTIONS_PER_OPPORTUNITY = 5;

    @Id
    private UUID id;

    @Column(name = "opportunity_id", nullable = false)
    private UUID opportunityId;

    @Column(nullable = false, length = 500)
    private String prompt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScreeningQuestionType type;

    @Column(nullable = false)
    private boolean required;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ScreeningQuestion() {
    }

    public static ScreeningQuestion create(
            UUID opportunityId, String prompt, ScreeningQuestionType type, boolean required, int position) {
        ScreeningQuestion question = new ScreeningQuestion();
        question.id = UUID.randomUUID();
        question.opportunityId = opportunityId;
        question.prompt = prompt;
        question.type = type;
        question.required = required;
        question.position = position;
        question.createdAt = Instant.now();
        return question;
    }

    /**
     * Moves this question to a new slot when an earlier question is removed, keeping {@code position}
     * a gapless 0-based sequence (which is what lets the database's position-range CHECK keep
     * enforcing the five-question cap).
     */
    public void reposition(int position) {
        this.position = position;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOpportunityId() {
        return opportunityId;
    }

    public String getPrompt() {
        return prompt;
    }

    public ScreeningQuestionType getType() {
        return type;
    }

    public boolean isRequired() {
        return required;
    }

    public int getPosition() {
        return position;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
