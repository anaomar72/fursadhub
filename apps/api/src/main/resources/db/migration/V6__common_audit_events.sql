-- Phase 1: append-only security/business audit trail (CLAUDE.md section 51).
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type VARCHAR(80) NOT NULL,
    user_id UUID,
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    metadata TEXT
);

CREATE INDEX idx_audit_events_user_id ON audit_events (user_id);
CREATE INDEX idx_audit_events_event_type ON audit_events (event_type);
