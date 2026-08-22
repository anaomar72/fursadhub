-- Phase 3: universities/departments targeted by an opportunity (CLAUDE.md section 9/10/34).
CREATE TABLE opportunity_targets (
    id UUID PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES internship_opportunities (id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities (id),
    requested_nominees INTEGER NOT NULL,
    nomination_deadline DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_opportunity_targets_nominees CHECK (requested_nominees >= 1),
    CONSTRAINT uk_opportunity_targets_opportunity_university UNIQUE (opportunity_id, university_id)
);

CREATE INDEX idx_opportunity_targets_opportunity_id ON opportunity_targets (opportunity_id);
CREATE INDEX idx_opportunity_targets_university_id ON opportunity_targets (university_id);

CREATE TABLE opportunity_target_departments (
    id UUID PRIMARY KEY,
    opportunity_target_id UUID NOT NULL REFERENCES opportunity_targets (id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_opportunity_target_departments UNIQUE (opportunity_target_id, department_id)
);

CREATE INDEX idx_opportunity_target_departments_target_id ON opportunity_target_departments (opportunity_target_id);
