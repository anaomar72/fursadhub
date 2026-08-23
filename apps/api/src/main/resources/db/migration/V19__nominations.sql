-- Phase 4: university nominations (CLAUDE.md section 35).
--
-- A nomination is deliberately a separate entity from the candidacy it may later produce: it
-- exists BEFORE the student has consented, carries university/coordinator metadata, and keeps its
-- own history. Creating a nomination must never by itself expose the student to the organization —
-- only an ACCEPTED nomination creates/merges a candidacy (Phase 4 brief section 5).
CREATE TABLE nominations (
    id UUID PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES internship_opportunities (id) ON DELETE CASCADE,
    opportunity_target_id UUID NOT NULL REFERENCES opportunity_targets (id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities (id),
    -- Snapshot of the student's department at nomination time, so a later enrollment change never
    -- silently rewrites which department scope this nomination was made under.
    department_id UUID NOT NULL REFERENCES departments (id),
    student_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    nominated_by_user_id UUID NOT NULL REFERENCES users (id),
    status VARCHAR(30) NOT NULL,
    note VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT ck_nominations_status
        CHECK (status IN ('PENDING_STUDENT_CONSENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'))
);

CREATE INDEX idx_nominations_opportunity_id ON nominations (opportunity_id);
CREATE INDEX idx_nominations_student_user_id ON nominations (student_user_id);
-- University staff queue: "which nominations exist for my university", filtered by department scope.
CREATE INDEX idx_nominations_university_department ON nominations (university_id, department_id);
-- Student's pending-consent inbox.
CREATE INDEX idx_nominations_student_status ON nominations (student_user_id, status);

-- A student may hold only ONE live nomination per opportunity at a time. DECLINED/WITHDRAWN
-- nominations are intentionally excluded so a student who declined (or whose nomination was
-- withdrawn) can legitimately be re-nominated later, while the earlier rows are preserved as
-- history rather than deleted (CLAUDE.md section 51 — never silently overwrite history).
CREATE UNIQUE INDEX uk_nominations_live_per_opportunity_student
    ON nominations (opportunity_id, student_user_id)
    WHERE status IN ('PENDING_STUDENT_CONSENT', 'ACCEPTED');
