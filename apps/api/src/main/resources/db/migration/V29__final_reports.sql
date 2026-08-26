-- Phase 6: the student's final internship report (CLAUDE.md section 45).
--
-- The report FILE is private. This row only points at it; reading the bytes requires passing the
-- placement's authorization check, and every such read is audited (PRIVATE_FILE_ACCESSED).
CREATE TABLE final_reports (
    id UUID PRIMARY KEY,
    placement_id UUID NOT NULL REFERENCES placements (id) ON DELETE CASCADE,
    -- NULL while the student has created the report but not yet attached a PDF. RESTRICT rather
    -- than CASCADE: a stored file backing a submitted report must not be deletable out from under it.
    stored_file_id UUID REFERENCES stored_files (id) ON DELETE RESTRICT,

    state VARCHAR(30) NOT NULL,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users (id),
    review_comment VARCHAR(2000),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_final_reports_state
        CHECK (state IN ('DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED')),
    -- A report cannot leave DRAFT without a file attached. This is the structural version of "you
    -- cannot submit an empty report".
    CONSTRAINT ck_final_reports_file_required
        CHECK (state = 'DRAFT' OR stored_file_id IS NOT NULL),
    -- One report per placement; resubmission after NEEDS_REVISION reuses this row rather than
    -- creating a second report, so the review history stays on one timeline.
    CONSTRAINT uk_final_reports_placement UNIQUE (placement_id)
);
