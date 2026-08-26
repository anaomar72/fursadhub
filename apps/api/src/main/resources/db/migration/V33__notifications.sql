-- Phase 7: in-app notifications (CLAUDE.md sections 55-56).
--
-- Stored as a stable TYPE CODE plus safe JSON parameters, never as rendered English prose. That is
-- what makes CLAUDE.md section 56 achievable for notifications: the same row renders in English or
-- Somali depending on who is reading it and when, because the wording lives in the frontend
-- translation files rather than being frozen into the database at write time.
--
-- The payload carries only safe identifiers and small scalars (a week number, an attempt number, an
-- opportunity title). It must never carry a student's written log content, a review comment's body,
-- report text, or anything from a token (CLAUDE.md section 68).
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    -- The recipient. Notifications are strictly per-user: there is no broadcast, and no endpoint
    -- anywhere accepts a user id from the browser (CLAUDE.md section 12).
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    notification_type VARCHAR(60) NOT NULL,
    -- JSON object of translation parameters. TEXT rather than JSONB: FursadHub never queries into it,
    -- only reads it back whole, so JSONB's index/operator support would buy nothing.
    payload TEXT NOT NULL DEFAULT '{}',
    -- Relative in-app path this notification points at, e.g. /student/placements/{id}/weekly-logs.
    -- Relative on purpose: never an absolute URL, so a notification can never navigate off-platform.
    link_path VARCHAR(512),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_notifications_link_relative CHECK (link_path IS NULL OR link_path LIKE '/%')
);

-- The two real query patterns: "my notifications, newest first" and "how many are unread".
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;
