-- Phase 4: opportunity screening questions (CLAUDE.md section 9/10 of the Phase 4 brief).
-- Deliberately NOT a generic dynamic-form engine: a fixed, closed set of four question types and a
-- hard maximum of five questions per opportunity, both enforced in the domain/service layer and
-- backed here by database constraints (CLAUDE.md section 52 — critical invariants get real
-- PostgreSQL constraints in addition to Java checks).
CREATE TABLE screening_questions (
    id UUID PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES internship_opportunities (id) ON DELETE CASCADE,
    prompt VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL,
    required BOOLEAN NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_screening_questions_type
        CHECK (type IN ('SHORT_TEXT', 'LONG_TEXT', 'YES_NO', 'SINGLE_CHOICE')),
    -- Maximum 5 questions per opportunity: positions are a gapless 0-based sequence and unique per
    -- opportunity, so capping the position range caps the row count per opportunity in the database
    -- itself, not only in service logic.
    CONSTRAINT ck_screening_questions_position CHECK (position >= 0 AND position <= 4),
    -- DEFERRABLE so deleting a question can renumber the survivors in one statement: shifting
    -- positions down transiently collides (2 -> 1 while 1 still exists) and Postgres checks
    -- non-deferred unique constraints per row. Deferring the check to COMMIT lets the whole
    -- renumber apply atomically while still rejecting any end-state that actually duplicates.
    CONSTRAINT uk_screening_questions_opportunity_position UNIQUE (opportunity_id, position)
        DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX idx_screening_questions_opportunity_id ON screening_questions (opportunity_id);

CREATE TABLE screening_question_choices (
    id UUID PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES screening_questions (id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_screening_question_choices_position CHECK (position >= 0),
    CONSTRAINT uk_screening_question_choices_position UNIQUE (question_id, position)
);

CREATE INDEX idx_screening_question_choices_question_id ON screening_question_choices (question_id);
