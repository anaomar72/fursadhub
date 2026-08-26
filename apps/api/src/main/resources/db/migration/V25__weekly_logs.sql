-- Phase 6: student weekly logs (CLAUDE.md section 42).
--
-- One row per placement-week. The student authors it, an authorized university actor reviews it,
-- and every review decision is stamped rather than overwritten.
CREATE TABLE weekly_logs (
    id UUID PRIMARY KEY,
    placement_id UUID NOT NULL REFERENCES placements (id) ON DELETE CASCADE,
    -- 1-based, relative to the placement's own start date. Bounded here so an absurd value cannot
    -- reach the table even if a future caller skips the service-layer range check.
    week_number INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    summary VARCHAR(2000) NOT NULL,
    activities VARCHAR(4000),
    challenges VARCHAR(2000),
    learning_outcomes VARCHAR(2000),

    state VARCHAR(30) NOT NULL,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users (id),
    review_comment VARCHAR(2000),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_weekly_logs_state
        CHECK (state IN ('DRAFT', 'SUBMITTED', 'RETURNED_FOR_CHANGES', 'REVIEWED')),
    CONSTRAINT ck_weekly_logs_week_number CHECK (week_number BETWEEN 1 AND 260),
    CONSTRAINT ck_weekly_logs_period CHECK (period_start <= period_end),
    -- CLAUDE.md section 52. The hard guarantee that a double-submitted "create week 3" cannot
    -- produce two week 3 logs, regardless of what the service layer checked first.
    CONSTRAINT uk_weekly_logs_placement_week UNIQUE (placement_id, week_number)
);

CREATE INDEX idx_weekly_logs_placement ON weekly_logs (placement_id);
-- The supervisor's review queue: "logs waiting on me", across the placements they are assigned to.
CREATE INDEX idx_weekly_logs_state ON weekly_logs (state) WHERE state = 'SUBMITTED';
