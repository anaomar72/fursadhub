-- Fix: replace link-based email verification with a 4-digit code challenge (CLAUDE.md section 13).
ALTER TABLE email_verification_tokens RENAME COLUMN token_hash TO code_hash;
ALTER TABLE email_verification_tokens DROP CONSTRAINT uk_email_verification_tokens_hash;
ALTER TABLE email_verification_tokens ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0;

-- At most one active (unconsumed) verification code per user — issuing a new one (registration
-- resend) always invalidates any previous one, so a code collision between two different users'
-- concurrently active challenges can never be ambiguous.
CREATE UNIQUE INDEX uk_email_verification_tokens_active_user ON email_verification_tokens (user_id) WHERE consumed_at IS NULL;
