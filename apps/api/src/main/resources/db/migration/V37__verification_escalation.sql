-- Phase 7: escalating a student verification case to the platform (Phase 7 "Admin: verification
-- escalation").
--
-- The case's own state machine (CLAUDE.md section 30) is NOT touched: DRAFT/SUBMITTED/UNDER_REVIEW/
-- NEEDS_MORE_EVIDENCE/VERIFIED/REJECTED/REVOKED stay exactly as frozen, and an escalated case moves
-- through those same states. Escalation is a FLAG that changes WHO may act, not a new state — which
-- is why it is two nullable columns rather than an eighth status value.
--
-- Why it exists: a university coordinator can hit a case they cannot resolve — a disputed identity,
-- a student whose records the university itself cannot confirm. Before this, the case simply sat in
-- the queue with no route to anyone with more authority.
ALTER TABLE student_verification_cases
    ADD COLUMN escalated_at TIMESTAMPTZ,
    ADD COLUMN escalated_by_user_id UUID REFERENCES users (id),
    ADD COLUMN escalation_reason VARCHAR(2000);

-- The platform escalation queue.
CREATE INDEX idx_verification_cases_escalated
    ON student_verification_cases (escalated_at)
    WHERE escalated_at IS NOT NULL;
