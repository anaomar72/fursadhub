package com.fursadhub.candidacy.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One student's answer to one of an opportunity's screening questions (CLAUDE.md Phase 4
 * section 10). Answers only ever exist because the student actually supplied them while
 * self-applying — FursadHub never fabricates screening responses on a student's behalf, so a
 * nomination-sourced candidacy legitimately has none.
 */
@Entity
@Table(name = "screening_answers")
public class ScreeningAnswer {

    @Id
    private UUID id;

    @Column(name = "candidacy_id", nullable = false)
    private UUID candidacyId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "answer_text", nullable = false, length = 4000)
    private String answerText;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ScreeningAnswer() {
    }

    public static ScreeningAnswer create(UUID candidacyId, UUID questionId, String answerText) {
        ScreeningAnswer answer = new ScreeningAnswer();
        answer.id = UUID.randomUUID();
        answer.candidacyId = candidacyId;
        answer.questionId = questionId;
        answer.answerText = answerText;
        answer.createdAt = Instant.now();
        return answer;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidacyId() {
        return candidacyId;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public String getAnswerText() {
        return answerText;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
