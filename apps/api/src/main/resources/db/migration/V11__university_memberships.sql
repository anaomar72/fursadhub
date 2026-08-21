-- Phase 2: university staff roles and their department scope (CLAUDE.md section 25).
CREATE TABLE university_memberships (
    id UUID PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_university_memberships_university_id ON university_memberships (university_id);
CREATE INDEX idx_university_memberships_user_id ON university_memberships (user_id);

-- A user may hold only one active role at a given university at a time.
CREATE UNIQUE INDEX uk_university_memberships_active ON university_memberships (university_id, user_id) WHERE revoked_at IS NULL;

CREATE TABLE university_membership_departments (
    id UUID PRIMARY KEY,
    membership_id UUID NOT NULL REFERENCES university_memberships (id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments (id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at TIMESTAMPTZ
);

CREATE INDEX idx_membership_departments_membership_id ON university_membership_departments (membership_id);

CREATE UNIQUE INDEX uk_membership_departments_active ON university_membership_departments (membership_id, department_id) WHERE removed_at IS NULL;
