-- Phase C1: platform RBAC foundation — custom roles and direct permission grants.
--
-- ADDITIVE ONLY. Four new tables; no existing row is read, rewritten or deleted, and platform_admins
-- (V31) is untouched, so every existing SUPER_ADMIN / VERIFICATION_OFFICER grant keeps exactly its
-- current meaning. Nothing here grants anything to anyone: all four tables start empty.
--
-- Permission codes are the stable names of com.fursadhub.administration.domain.PlatformPermission.
-- The CHECK lists below admit ONLY the grantable codes (AVAILABLE + ASSIGNABLE). Reserved
-- capabilities (INSTITUTION_REINSTATE, SUPPORT_REQUEST_HANDLE) and Super-Admin-only ones
-- (INSTITUTION_REVOKE, INSTITUTION_REINSTATE, LEGAL_DOCUMENT_PUBLISH) are refused by PostgreSQL itself, so no code path —
-- a future service, a manual fix-up — can store them in a role or grant. Widening the list is a
-- deliberate new migration; PlatformRbacFoundationIT fails if Java and these lists disagree.
--
-- Foreign keys to users use the default NO ACTION (never CASCADE, unlike V31): grant history must
-- not disappear with an account. FursadHub closes accounts; it does not delete them.

CREATE TABLE platform_custom_roles (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    -- Optimistic locking (JPA @Version): two Super Admins editing the same role's permission set
    -- cannot silently overwrite each other; the second save fails and must reload.
    version BIGINT NOT NULL DEFAULT 0,
    created_by_user_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at TIMESTAMPTZ,
    deactivated_by_user_id UUID REFERENCES users (id),

    CONSTRAINT ck_platform_custom_roles_name_trimmed
        CHECK (name = btrim(name) AND char_length(name) BETWEEN 2 AND 80),
    -- A custom role may never masquerade as a protected system role.
    CONSTRAINT ck_platform_custom_roles_name_not_system
        CHECK (lower(regexp_replace(name, '[\s_-]+', '', 'g')) NOT IN ('superadmin', 'verificationofficer')),
    CONSTRAINT ck_platform_custom_roles_deactivation_consistent
        CHECK ((active AND deactivated_at IS NULL AND deactivated_by_user_id IS NULL)
            OR (NOT active AND deactivated_at IS NOT NULL AND deactivated_by_user_id IS NOT NULL)),
    CONSTRAINT ck_platform_custom_roles_version_non_negative CHECK (version >= 0)
);

-- Case-insensitive uniqueness across active AND deactivated roles: reusing a deactivated role's name
-- for a different permission set would make audit history ambiguous.
CREATE UNIQUE INDEX uk_platform_custom_roles_name ON platform_custom_roles (lower(name));

CREATE TABLE platform_custom_role_permissions (
    role_id UUID NOT NULL REFERENCES platform_custom_roles (id),
    permission VARCHAR(60) NOT NULL,

    PRIMARY KEY (role_id, permission),
    CONSTRAINT ck_platform_custom_role_permissions_grantable CHECK (permission IN (
        'INSTITUTION_REVIEW_READ',
        'INSTITUTION_REVIEW_DECIDE',
        'INSTITUTION_SUSPEND',
        'STUDENT_ESCALATION_REVIEW',
        'USER_ACCOUNT_READ',
        'USER_ACCOUNT_SUSPEND',
        'USER_ACCOUNT_REACTIVATE',
        'AUDIT_READ',
        'PLATFORM_STATISTICS_READ',
        'OPPORTUNITY_OVERSIGHT_READ',
        'PRIVACY_REQUEST_PROCESS',
        'TESTIMONIAL_MODERATE'
    ))
);

-- Revocation is a soft close (revoked_at), never a delete — the same history rule as V31.
CREATE TABLE platform_staff_role_assignments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id),
    custom_role_id UUID NOT NULL REFERENCES platform_custom_roles (id),
    granted_by_user_id UUID NOT NULL REFERENCES users (id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users (id),

    -- Nobody assigns platform access to themselves.
    CONSTRAINT ck_platform_staff_role_assignments_not_self CHECK (granted_by_user_id <> user_id),
    CONSTRAINT ck_platform_staff_role_assignments_revocation_consistent
        CHECK ((revoked_at IS NULL) = (revoked_by_user_id IS NULL))
);

-- At most one ACTIVE assignment of a given role per user; history rows are unaffected. This index,
-- not a read-then-write, decides two concurrent identical assignments.
CREATE UNIQUE INDEX uk_platform_staff_role_assignments_active
    ON platform_staff_role_assignments (user_id, custom_role_id)
    WHERE revoked_at IS NULL;

-- "Which staff hold this role?" — the affected-staff review before editing or deactivating a role.
CREATE INDEX idx_platform_staff_role_assignments_role_active
    ON platform_staff_role_assignments (custom_role_id)
    WHERE revoked_at IS NULL;

CREATE TABLE platform_staff_permission_grants (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id),
    permission VARCHAR(60) NOT NULL,
    granted_by_user_id UUID NOT NULL REFERENCES users (id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users (id),

    CONSTRAINT ck_platform_staff_permission_grants_not_self CHECK (granted_by_user_id <> user_id),
    CONSTRAINT ck_platform_staff_permission_grants_revocation_consistent
        CHECK ((revoked_at IS NULL) = (revoked_by_user_id IS NULL)),
    CONSTRAINT ck_platform_staff_permission_grants_grantable CHECK (permission IN (
        'INSTITUTION_REVIEW_READ',
        'INSTITUTION_REVIEW_DECIDE',
        'INSTITUTION_SUSPEND',
        'STUDENT_ESCALATION_REVIEW',
        'USER_ACCOUNT_READ',
        'USER_ACCOUNT_SUSPEND',
        'USER_ACCOUNT_REACTIVATE',
        'AUDIT_READ',
        'PLATFORM_STATISTICS_READ',
        'OPPORTUNITY_OVERSIGHT_READ',
        'PRIVACY_REQUEST_PROCESS',
        'TESTIMONIAL_MODERATE'
    ))
);

CREATE UNIQUE INDEX uk_platform_staff_permission_grants_active
    ON platform_staff_permission_grants (user_id, permission)
    WHERE revoked_at IS NULL;
