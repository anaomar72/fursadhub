-- Phase 7: platform-level roles (CLAUDE.md section 23).
--
-- Until now FursadHub had no model for the two PLATFORM roles at all: SUPER_ADMIN and
-- VERIFICATION_OFFICER were named in CLAUDE.md and referenced in Organization's Javadoc, but no
-- table, enum or authorization component existed, which is why Phase 3 could implement an
-- organization's own submit-for-verification transition and nothing on the reviewer side.
--
-- This is deliberately the SAME shape as university_memberships and organization_memberships: a
-- contextual, revocable grant that is re-read from PostgreSQL on every request, never a claim baked
-- into a JWT (CLAUDE.md section 15/24). Revoking a platform admin therefore takes effect on their
-- very next call, not when their access token happens to expire.
CREATE TABLE platform_admins (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    -- Who granted this. NULL only for the ops-bootstrapped first SUPER_ADMIN, which by definition
    -- has no earlier admin to have granted it.
    granted_by_user_id UUID REFERENCES users (id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Revocation is a soft close, never a delete: who held platform authority and when is exactly
    -- the kind of history CLAUDE.md section 51 forbids silently overwriting.
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users (id),

    CONSTRAINT ck_platform_admins_role CHECK (role IN ('SUPER_ADMIN', 'VERIFICATION_OFFICER'))
);

-- At most ONE active grant per user per role. Partial (WHERE revoked_at IS NULL) so the same user
-- may hold a role, have it revoked, and be granted it again later without colliding with the
-- historical row — the same pattern Phase 5 uses for one-active-supervisor.
CREATE UNIQUE INDEX uk_platform_admins_active_role
    ON platform_admins (user_id, role)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_platform_admins_user_id ON platform_admins (user_id);
