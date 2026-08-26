-- Phase 7: data-subject requests (CLAUDE.md section 50).
--
-- The six request types and four states are frozen by CLAUDE.md and enforced here as CHECK
-- constraints, not only in Java. Processing is MANUAL for the pilot, which section 50 explicitly
-- permits: an admin reads the request, does the work, and records the outcome. Nothing here
-- automatically deletes or exports a user's data, because an ERASURE that fires on its own would
-- happily destroy records tied to a live placement or an open verification case.
CREATE TABLE privacy_requests (
    id UUID PRIMARY KEY,
    -- The data subject. Always the authenticated caller at submission time — this column is never
    -- populated from a request body (CLAUDE.md section 12).
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    request_type VARCHAR(40) NOT NULL,
    state VARCHAR(40) NOT NULL,
    -- What the user asked for, in their own words.
    details VARCHAR(4000),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by_user_id UUID REFERENCES users (id),
    reviewed_at TIMESTAMPTZ,
    -- What the admin did about it. Part of the permanent record.
    resolution_note VARCHAR(4000),

    CONSTRAINT ck_privacy_requests_type CHECK (
        request_type IN ('ACCESS', 'CORRECTION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION')),
    CONSTRAINT ck_privacy_requests_state CHECK (
        state IN ('SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED')),
    -- A resolved request must say who resolved it and when. Terminal states are not reachable
    -- without an actor, so "COMPLETED by nobody" cannot exist even if a service forgot to set it.
    CONSTRAINT ck_privacy_requests_resolution CHECK (
        state IN ('SUBMITTED', 'IN_REVIEW')
        OR (reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE INDEX idx_privacy_requests_user ON privacy_requests (user_id, submitted_at DESC);
-- The admin queue: open requests, oldest first.
CREATE INDEX idx_privacy_requests_open
    ON privacy_requests (submitted_at)
    WHERE state IN ('SUBMITTED', 'IN_REVIEW');
