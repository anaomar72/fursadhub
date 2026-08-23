-- Phase 3: one internship opportunity model spanning PUBLIC/UNIVERSITY_TARGETED/HYBRID sourcing
-- modes (CLAUDE.md section 2/5/32-33).
CREATE TABLE internship_opportunities (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(4000) NOT NULL,
    responsibilities VARCHAR(4000),
    requirements VARCHAR(4000),
    mode VARCHAR(30) NOT NULL,
    number_of_openings INTEGER NOT NULL,
    work_mode VARCHAR(20) NOT NULL,
    location VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    application_deadline DATE,
    status VARCHAR(20) NOT NULL,
    published_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_internship_opportunities_openings CHECK (number_of_openings >= 1),
    CONSTRAINT ck_internship_opportunities_dates CHECK (start_date < end_date)
);

CREATE INDEX idx_internship_opportunities_organization_id ON internship_opportunities (organization_id);
CREATE INDEX idx_internship_opportunities_status_mode ON internship_opportunities (status, mode);
