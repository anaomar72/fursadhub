-- Phase 2: university tenants and their departments (CLAUDE.md section 25).
CREATE TABLE universities (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    city VARCHAR(120),
    status VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_universities_slug UNIQUE (slug)
);

CREATE TABLE departments (
    id UUID PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_departments_university_code UNIQUE (university_id, code)
);

CREATE INDEX idx_departments_university_id ON departments (university_id);
