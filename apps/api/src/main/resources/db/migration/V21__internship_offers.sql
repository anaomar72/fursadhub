-- Phase 4: internship offers (CLAUDE.md section 38).
--
-- An offer is its own entity, never "just a candidacy status": it carries dates, a response
-- deadline, location/details, and its own lifecycle. A candidacy can therefore never be OFFERED
-- without a real offer record backing it.
CREATE TABLE internship_offers (
    id UUID PRIMARY KEY,
    candidacy_id UUID NOT NULL REFERENCES candidacies (id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    response_deadline DATE NOT NULL,
    location VARCHAR(255),
    details VARCHAR(2000),
    status VARCHAR(20) NOT NULL,
    created_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT ck_internship_offers_status
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN')),
    CONSTRAINT ck_internship_offers_dates CHECK (start_date < end_date)
);

CREATE INDEX idx_internship_offers_candidacy_id ON internship_offers (candidacy_id);
CREATE INDEX idx_internship_offers_status ON internship_offers (status);

-- At most one live offer per candidacy. DECLINED/EXPIRED/WITHDRAWN offers are excluded so a
-- recruiter may legitimately send a fresh offer after a declined or lapsed one, while every
-- previous offer is preserved as history. An ACCEPTED offer is included, so once a student accepts
-- no further offer can be opened on that candidacy.
CREATE UNIQUE INDEX uk_internship_offers_live_per_candidacy
    ON internship_offers (candidacy_id)
    WHERE status IN ('PENDING', 'ACCEPTED');
