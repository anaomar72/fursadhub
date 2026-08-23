-- Phase 3: organization tenants (CLAUDE.md section 26). Unlike universities (Flyway-seeded pilot
-- tenants), organizations are created dynamically through self-service registration.
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    type VARCHAR(20) NOT NULL,
    registration_number VARCHAR(120),
    website VARCHAR(255),
    description VARCHAR(2000),
    verification_status VARCHAR(40) NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_organizations_slug UNIQUE (slug)
);
