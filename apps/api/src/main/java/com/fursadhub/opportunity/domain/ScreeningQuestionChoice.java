package com.fursadhub.opportunity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** One allowed answer for a {@code SINGLE_CHOICE} screening question (CLAUDE.md Phase 4 section 9). */
@Entity
@Table(name = "screening_question_choices")
public class ScreeningQuestionChoice {

    @Id
    private UUID id;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ScreeningQuestionChoice() {
    }

    public static ScreeningQuestionChoice create(UUID questionId, String label, int position) {
        ScreeningQuestionChoice choice = new ScreeningQuestionChoice();
        choice.id = UUID.randomUUID();
        choice.questionId = questionId;
        choice.label = label;
        choice.position = position;
        choice.createdAt = Instant.now();
        return choice;
    }

    public UUID getId() {
        return id;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public String getLabel() {
        return label;
    }

    public int getPosition() {
        return position;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
