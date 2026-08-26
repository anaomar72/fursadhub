-- Phase 6: controlled internship-completion policy and its per-placement snapshot
-- (CLAUDE.md section 41).
--
-- This is deliberately NOT a rules engine. There are exactly five boolean requirements, frozen by
-- CLAUDE.md, and they are stored as five columns. A new requirement would need a migration and a
-- domain change, which is the point: FursadHub must not be able to grow arbitrary configurable
-- completion rules by accident.

CREATE TABLE internship_policies (
    id UUID PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities (id) ON DELETE CASCADE,
    -- NULL means "the university-wide default". A non-NULL department_id is an override that
    -- applies to that department only. Two levels, no inheritance chain beyond them.
    department_id UUID REFERENCES departments (id) ON DELETE CASCADE,

    weekly_logs_required              BOOLEAN NOT NULL DEFAULT FALSE,
    attendance_required               BOOLEAN NOT NULL DEFAULT FALSE,
    organization_evaluation_required  BOOLEAN NOT NULL DEFAULT FALSE,
    final_report_required             BOOLEAN NOT NULL DEFAULT FALSE,
    defense_required                  BOOLEAN NOT NULL DEFAULT FALSE,

    updated_by UUID REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

-- Exactly one university-level policy per university. A partial unique index is required rather
-- than a plain UNIQUE(university_id, department_id) because PostgreSQL treats NULLs as distinct,
-- so the plain constraint would happily allow two university-level rows.
CREATE UNIQUE INDEX uk_internship_policies_university_default
    ON internship_policies (university_id)
    WHERE department_id IS NULL;

-- Exactly one override per department.
CREATE UNIQUE INDEX uk_internship_policies_department
    ON internship_policies (university_id, department_id)
    WHERE department_id IS NOT NULL;

-- A department override must belong to the same university as the policy row claims, otherwise a
-- badly-formed write could attach University A's policy to University B's department and quietly
-- cross a tenant boundary. Enforced in the database, not only in Java (CLAUDE.md section 52).
CREATE OR REPLACE FUNCTION fursadhub_policy_department_matches_university()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.department_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM departments d
           WHERE d.id = NEW.department_id AND d.university_id = NEW.university_id
       ) THEN
        RAISE EXCEPTION 'internship policy department % does not belong to university %',
            NEW.department_id, NEW.university_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_internship_policies_department_university
    BEFORE INSERT OR UPDATE ON internship_policies
    FOR EACH ROW EXECUTE FUNCTION fursadhub_policy_department_matches_university();

-- ---------------------------------------------------------------- policy snapshot

-- Historical safety (Phase 6 section 4). Editing a university's policy in 2027 must not make a
-- placement completed in 2026 impossible to interpret, so the RESOLVED requirements are frozen onto
-- the placement the first time any Phase 6 activity touches it and are never re-resolved.
--
-- This is a snapshot, not a versioning system: there is no policy history table, no effective-dating
-- and no "which version applied when" query surface. The five booleans that actually governed one
-- placement live on that placement's own row, which is the smallest thing that answers the question.
CREATE TABLE placement_policy_snapshots (
    id UUID PRIMARY KEY,
    placement_id UUID NOT NULL REFERENCES placements (id) ON DELETE CASCADE,

    weekly_logs_required              BOOLEAN NOT NULL,
    attendance_required               BOOLEAN NOT NULL,
    organization_evaluation_required  BOOLEAN NOT NULL,
    final_report_required             BOOLEAN NOT NULL,
    defense_required                  BOOLEAN NOT NULL,

    -- Where the resolved values came from, kept for explainability rather than for logic.
    source VARCHAR(30) NOT NULL,
    -- The policy row that was read, if any. ON DELETE SET NULL: deleting a policy must never
    -- cascade into deleting the historical record of what a finished internship required.
    source_policy_id UUID REFERENCES internship_policies (id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_pps_source CHECK (source IN ('DEPARTMENT', 'UNIVERSITY', 'PLATFORM_DEFAULT')),
    -- One frozen snapshot per placement. Two concurrent first-touches cannot both insert; the loser
    -- re-reads the winner's row, so the snapshot is resolved exactly once (CLAUDE.md section 54).
    CONSTRAINT uk_pps_placement UNIQUE (placement_id)
);
