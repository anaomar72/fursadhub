-- Phase 2: university attestation review cases and account-binding challenges (CLAUDE.md section 29-30).
CREATE TABLE student_verification_cases (
    id UUID PRIMARY KEY,
    enrollment_id UUID NOT NULL REFERENCES student_enrollments (id) ON DELETE CASCADE,
    status VARCHAR(40) NOT NULL,
    review_notes VARCHAR(2000),
    reviewed_by_user_id UUID REFERENCES users (id),
    submitted_at TIMESTAMPTZ NOT NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One enrollment carries at most one (current) verification case for the pilot.
    CONSTRAINT uk_verification_cases_enrollment UNIQUE (enrollment_id)
);

CREATE TABLE verification_challenges (
    id UUID PRIMARY KEY,
    verification_case_id UUID NOT NULL REFERENCES student_verification_cases (id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_verification_challenges_case_hash UNIQUE (verification_case_id, code_hash)
);

CREATE INDEX idx_verification_challenges_case_id ON verification_challenges (verification_case_id);
