-- Phase 6: defense attempts (CLAUDE.md section 46).
--
-- Every attempt is its own row and is NEVER overwritten. A retake inserts attempt N+1; attempt N
-- keeps its own state, result and panel notes forever. There is deliberately no "current attempt"
-- column on the placement, because such a column is exactly how history gets destroyed.
CREATE TABLE defense_attempts (
    id UUID PRIMARY KEY,
    placement_id UUID NOT NULL REFERENCES placements (id) ON DELETE CASCADE,
    -- 1-based and strictly increasing per placement.
    attempt_number INTEGER NOT NULL,

    scheduled_at TIMESTAMPTZ NOT NULL,
    location_details VARCHAR(500),

    state VARCHAR(20) NOT NULL,
    result VARCHAR(20),
    panel_notes VARCHAR(2000),

    scheduled_by UUID NOT NULL REFERENCES users (id),
    completed_at TIMESTAMPTZ,
    recorded_by UUID REFERENCES users (id),
    cancelled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_defense_state CHECK (state IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_defense_result CHECK (result IS NULL OR result IN ('PASSED', 'FAILED', 'RETAKE_REQUIRED')),
    -- A result exists if and only if the attempt was actually held. A CANCELLED or still-SCHEDULED
    -- attempt carrying a result would be a contradiction the completion check could misread.
    CONSTRAINT ck_defense_result_when_completed CHECK ((state = 'COMPLETED') = (result IS NOT NULL)),
    CONSTRAINT ck_defense_completed_at CHECK ((state = 'COMPLETED') = (completed_at IS NOT NULL)),
    CONSTRAINT ck_defense_cancelled_at CHECK ((state = 'CANCELLED') = (cancelled_at IS NOT NULL)),
    CONSTRAINT ck_defense_attempt_number CHECK (attempt_number BETWEEN 1 AND 50),
    -- CLAUDE.md section 26/52. Two staff members scheduling a retake at the same moment both compute
    -- the same next attempt number; this constraint means only one of them can commit it, and the
    -- other retries against the row the winner wrote instead of creating a duplicate attempt 2.
    CONSTRAINT uk_defense_placement_attempt UNIQUE (placement_id, attempt_number)
);

CREATE INDEX idx_defense_placement ON defense_attempts (placement_id);
-- "Has this placement passed a defense?" — the completion check's only question.
CREATE INDEX idx_defense_passed
    ON defense_attempts (placement_id)
    WHERE state = 'COMPLETED' AND result = 'PASSED';
