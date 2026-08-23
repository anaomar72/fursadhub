-- Phase 4: the ONE unified candidacy pipeline (CLAUDE.md section 36/37).
--
-- Public self-applications and university nominations converge here. There is exactly one
-- candidacy per (opportunity, student) pair regardless of how the student entered the pipeline;
-- when both routes happen the `source` merges to BOTH rather than a second row being created.
CREATE TABLE candidacies (
    id UUID PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES internship_opportunities (id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Denormalized from the opportunity so the organization-scoped candidate pool can be
    -- authorized/queried without a join, and so the owning organization stays recorded even if the
    -- opportunity is later re-parented.
    organization_id UUID NOT NULL REFERENCES organizations (id),
    -- Academic context snapshot at the time the candidacy was opened (CLAUDE.md section 39 — a
    -- historical placement must stay tied to the correct academic context).
    university_id UUID NOT NULL REFERENCES universities (id),
    department_id UUID NOT NULL REFERENCES departments (id),
    source VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    -- JPA optimistic-lock counter: two recruiters concurrently advancing the same candidacy (one
    -- rejecting while another offers) must not silently overwrite each other's decision.
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_candidacies_source
        CHECK (source IN ('SELF_APPLICATION', 'UNIVERSITY_NOMINATION', 'BOTH')),
    CONSTRAINT ck_candidacies_status
        CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED',
                          'OFFER_DECLINED', 'OFFER_EXPIRED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
    -- CLAUDE.md section 36 critical invariant. This is the last-resort guarantee behind the
    -- application-level advisory lock that serializes a concurrent apply/nominate-accept race:
    -- even if two transactions somehow reached the insert, only one can commit.
    CONSTRAINT uk_candidacies_opportunity_student UNIQUE (opportunity_id, student_user_id)
);

-- Organization candidate pool for one opportunity, optionally narrowed by pipeline stage.
CREATE INDEX idx_candidacies_opportunity_status ON candidacies (opportunity_id, status);
-- "My applications" for a student.
CREATE INDEX idx_candidacies_student_user_id ON candidacies (student_user_id);
-- Cross-opportunity organization views.
CREATE INDEX idx_candidacies_organization_id ON candidacies (organization_id);

-- Append-only recruitment history (CLAUDE.md section 51). Rows are never updated or deleted; a
-- status change appends a row recording who did it and what the transition was.
CREATE TABLE candidacy_events (
    id UUID PRIMARY KEY,
    candidacy_id UUID NOT NULL REFERENCES candidacies (id) ON DELETE CASCADE,
    event_type VARCHAR(60) NOT NULL,
    -- Null for system-derived events such as lazy offer expiry, which no human actor triggers.
    actor_user_id UUID REFERENCES users (id),
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    metadata VARCHAR(500),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidacy_events_candidacy_id ON candidacy_events (candidacy_id, occurred_at);

-- Answers a student gave to the opportunity's screening questions when self-applying.
-- Nomination-sourced candidacies legitimately have no answers: FursadHub must never fabricate
-- screening responses on a student's behalf (Phase 4 brief section 10).
CREATE TABLE screening_answers (
    id UUID PRIMARY KEY,
    candidacy_id UUID NOT NULL REFERENCES candidacies (id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES screening_questions (id) ON DELETE CASCADE,
    answer_text VARCHAR(4000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_screening_answers_candidacy_question UNIQUE (candidacy_id, question_id)
);

CREATE INDEX idx_screening_answers_candidacy_id ON screening_answers (candidacy_id);
