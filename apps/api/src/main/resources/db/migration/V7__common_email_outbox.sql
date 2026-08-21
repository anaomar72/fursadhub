-- Phase 1: PostgreSQL-backed transactional-email outbox (CLAUDE.md section 55).
CREATE TABLE email_outbox (
    id UUID PRIMARY KEY,
    to_email VARCHAR(320) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    CONSTRAINT chk_email_outbox_status CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX idx_email_outbox_status ON email_outbox (status);
