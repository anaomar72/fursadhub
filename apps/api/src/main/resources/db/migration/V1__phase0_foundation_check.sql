-- Phase 0 engineering-foundation proof.
-- This table has no business meaning; it exists solely so the Testcontainers
-- integration test can prove PostgreSQL starts, Flyway runs, Spring connects,
-- and a migration-backed read/write succeeds. Real domain tables begin in Phase 1.
CREATE TABLE phase0_foundation_check (
    id UUID PRIMARY KEY,
    note VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
