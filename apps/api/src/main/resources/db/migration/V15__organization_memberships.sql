-- Phase 3: organization staff roles (CLAUDE.md section 3/26).
CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_organization_memberships_organization_id ON organization_memberships (organization_id);
CREATE INDEX idx_organization_memberships_user_id ON organization_memberships (user_id);

-- A user may hold only one active role at a given organization at a time.
CREATE UNIQUE INDEX uk_organization_memberships_active ON organization_memberships (organization_id, user_id) WHERE revoked_at IS NULL;
