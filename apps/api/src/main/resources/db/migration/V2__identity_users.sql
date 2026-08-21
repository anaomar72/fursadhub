-- Phase 1: FursadHub accounts (CLAUDE.md sections 13, 22).
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(40) NOT NULL,
    preferred_locale VARCHAR(5) NOT NULL DEFAULT 'en',
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_status CHECK (status IN ('PENDING_CONTACT_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED'))
);
