-- Phase 6: attendance (CLAUDE.md section 43).
--
-- Deliberately plain: a date, a value, and a confirmation state. There is NO location, device
-- fingerprint, biometric template or geofence column here, and none may be added — V1 attendance is
-- explicitly a human-confirmed record, not surveillance (CLAUDE.md section 27/43).
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY,
    placement_id UUID NOT NULL REFERENCES placements (id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,

    attendance_value VARCHAR(20) NOT NULL,
    confirmation_status VARCHAR(20) NOT NULL,

    -- The organization supervisor who recorded it, and whoever settled it afterwards.
    recorded_by UUID NOT NULL REFERENCES users (id),
    confirmed_by UUID REFERENCES users (id),
    disputed_by UUID REFERENCES users (id),
    resolved_by UUID REFERENCES users (id),

    -- Supervisor-side note. Visible to the placement's participants (student included), never to
    -- unrelated staff — attendance is only ever read through a placement-scoped authorization check.
    notes VARCHAR(1000),
    -- The student's own words when disputing, kept separate so a resolution cannot silently rewrite
    -- what the student actually claimed.
    dispute_reason VARCHAR(1000),
    resolution_note VARCHAR(1000),

    disputed_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_attendance_value CHECK (attendance_value IN ('PRESENT', 'ABSENT', 'EXCUSED')),
    CONSTRAINT ck_attendance_confirmation
        CHECK (confirmation_status IN ('RECORDED', 'CONFIRMED', 'DISPUTED', 'RESOLVED')),
    -- CLAUDE.md section 52. Two supervisors recording the same day concurrently cannot both commit.
    CONSTRAINT uk_attendance_placement_date UNIQUE (placement_id, attendance_date)
);

CREATE INDEX idx_attendance_placement ON attendance_records (placement_id);
-- Unsettled attendance is what blocks completion, so it is the query the checklist runs.
CREATE INDEX idx_attendance_unsettled
    ON attendance_records (placement_id)
    WHERE confirmation_status IN ('RECORDED', 'DISPUTED');
