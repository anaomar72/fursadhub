-- Phase 6: the organization supervisor's assessment of the student (CLAUDE.md section 44).
--
-- A FIXED V1 structure — five named 1-5 ratings and four free-text fields — not a rubric builder.
-- There is no questions table, no criteria table and no JSON blob of arbitrary items, because a
-- configurable rubric is explicitly out of scope and would be far harder to remove later than to
-- avoid now.
CREATE TABLE placement_evaluations (
    id UUID PRIMARY KEY,
    placement_id UUID NOT NULL REFERENCES placements (id) ON DELETE CASCADE,

    professionalism_rating   SMALLINT,
    reliability_rating       SMALLINT,
    communication_rating     SMALLINT,
    work_performance_rating  SMALLINT,
    teamwork_rating          SMALLINT,
    overall_rating           SMALLINT,

    strengths          VARCHAR(2000),
    improvement_areas  VARCHAR(2000),
    final_comments     VARCHAR(2000),

    state VARCHAR(20) NOT NULL,
    -- The supervisor who authored it. Kept even after reassignment, so a completed internship still
    -- records who actually assessed the student (CLAUDE.md section 40).
    evaluator_user_id UUID NOT NULL REFERENCES users (id),
    submitted_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES users (id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_evaluation_state CHECK (state IN ('DRAFT', 'SUBMITTED', 'FINAL')),
    -- Ratings are validated in Java too, but the range lives here as well so an out-of-range value
    -- can never be persisted by any path (CLAUDE.md section 52).
    CONSTRAINT ck_evaluation_ratings CHECK (
        (professionalism_rating  IS NULL OR professionalism_rating  BETWEEN 1 AND 5) AND
        (reliability_rating      IS NULL OR reliability_rating      BETWEEN 1 AND 5) AND
        (communication_rating    IS NULL OR communication_rating    BETWEEN 1 AND 5) AND
        (work_performance_rating IS NULL OR work_performance_rating BETWEEN 1 AND 5) AND
        (teamwork_rating         IS NULL OR teamwork_rating         BETWEEN 1 AND 5) AND
        (overall_rating          IS NULL OR overall_rating          BETWEEN 1 AND 5)
    ),
    -- Every rating must be present once the evaluation leaves DRAFT: a SUBMITTED or FINAL
    -- evaluation with holes in it is not an assessment.
    CONSTRAINT ck_evaluation_complete_when_submitted CHECK (
        state = 'DRAFT' OR (
            professionalism_rating IS NOT NULL AND reliability_rating IS NOT NULL AND
            communication_rating IS NOT NULL AND work_performance_rating IS NOT NULL AND
            teamwork_rating IS NOT NULL AND overall_rating IS NOT NULL
        )
    ),
    CONSTRAINT ck_evaluation_finalized_at CHECK ((state = 'FINAL') = (finalized_at IS NOT NULL)),
    -- One evaluation per placement. Re-running "finalize" cannot create a second one.
    CONSTRAINT uk_evaluation_placement UNIQUE (placement_id)
);
