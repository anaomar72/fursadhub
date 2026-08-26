-- Phase 7: outbox retry scheduling and delivery visibility (CLAUDE.md section 55).
--
-- The Phase 1 dispatcher retried a failed message on the very next 10-second tick, up to five times.
-- That burns all five attempts in under a minute, so a provider outage of even two minutes exhausts
-- every attempt and the message lands in FAILED permanently — precisely the case retries exist for.
--
-- next_attempt_at introduces exponential backoff (roughly 1m, 5m, 25m, 2h) so the same five attempts
-- span hours instead of seconds. The business transaction that enqueued the message was never
-- affected either way; this is about actually delivering the mail afterwards.
ALTER TABLE email_outbox
    ADD COLUMN next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Partial index: the dispatcher only ever asks for PENDING messages that are due.
CREATE INDEX idx_email_outbox_due
    ON email_outbox (next_attempt_at)
    WHERE status = 'PENDING';
