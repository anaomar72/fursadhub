-- Phase 4: the initial placement created by a successful offer acceptance (CLAUDE.md section 39).
--
-- Phase 4 only ever CREATES a PLANNED placement as part of the atomic offer-acceptance
-- transaction. The rest of the placement lifecycle (start/cancel/terminate/complete, supervisor
-- assignment and history) is Phase 5 scope and is deliberately not implemented yet — but the full
-- frozen status set is constrained here so Phase 5 does not need to rewrite this table.
CREATE TABLE placements (
    id UUID PRIMARY KEY,
    -- CLAUDE.md section 52: exactly one placement per candidacy. This is the hard guarantee that a
    -- retried/double-clicked/concurrent offer acceptance can never produce a second placement.
    candidacy_id UUID NOT NULL REFERENCES candidacies (id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES internship_offers (id),
    opportunity_id UUID NOT NULL REFERENCES internship_opportunities (id),
    student_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id),
    -- Academic context is stored on the placement itself (not looked up live through the student's
    -- current enrollment) so a historical placement stays tied to the university/department it was
    -- actually served under (CLAUDE.md section 39).
    university_id UUID NOT NULL REFERENCES universities (id),
    department_id UUID NOT NULL REFERENCES departments (id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location VARCHAR(255),
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_placements_status
        CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED', 'CANCELLED', 'TERMINATED')),
    CONSTRAINT ck_placements_dates CHECK (start_date < end_date),
    CONSTRAINT uk_placements_candidacy UNIQUE (candidacy_id),
    CONSTRAINT uk_placements_offer UNIQUE (offer_id)
);

CREATE INDEX idx_placements_student_user_id ON placements (student_user_id);
CREATE INDEX idx_placements_organization_id ON placements (organization_id);
CREATE INDEX idx_placements_university_department ON placements (university_id, department_id);

-- Student availability model for the pilot (CLAUDE.md section 38 step 4 "update student
-- availability"): FursadHub's frozen model has no separate availability flag, so availability is
-- DERIVED from placements rather than duplicated into a column that could drift out of sync. A
-- student occupying a live placement is unavailable, and this partial unique index makes that a
-- database guarantee instead of only a service-layer check — two concurrent offer acceptances for
-- the same student across different opportunities cannot both commit.
CREATE UNIQUE INDEX uk_placements_one_live_per_student
    ON placements (student_user_id)
    WHERE status IN ('PLANNED', 'ACTIVE', 'COMPLETION_PENDING');
