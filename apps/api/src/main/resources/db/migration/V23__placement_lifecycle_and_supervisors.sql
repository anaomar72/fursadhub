-- Phase 5: the placement lifecycle and supervisor assignment history (CLAUDE.md sections 39-40).
--
-- V22 (Phase 4) already created `placements` with the full frozen status set, the academic-context
-- columns, UNIQUE(candidacy_id), and the partial unique index that derives student availability.
-- None of that is touched here — this migration only ADDS what the lifecycle needs, so the Phase 4
-- offer-acceptance guarantees keep holding exactly as they did.

-- ---------------------------------------------------------------- placement lifecycle

ALTER TABLE placements
    ADD COLUMN started_at              TIMESTAMPTZ,
    ADD COLUMN completion_requested_at TIMESTAMPTZ,
    ADD COLUMN completed_at            TIMESTAMPTZ,
    ADD COLUMN cancelled_at            TIMESTAMPTZ,
    ADD COLUMN terminated_at           TIMESTAMPTZ,
    -- Free-text staff explanations. Deliberately generous but bounded, and never used to carry
    -- structured state — the status column is the single source of truth for the lifecycle.
    ADD COLUMN cancellation_reason     VARCHAR(1000),
    ADD COLUMN termination_reason      VARCHAR(1000),
    -- JPA @Version. Lifecycle commands also take SELECT ... FOR UPDATE on the row; this is the
    -- second line of defence for any future path that reads without locking first.
    ADD COLUMN version                 BIGINT NOT NULL DEFAULT 0;

-- The status column already carries a CHECK constraint for the frozen six-state set (V22), so the
-- lifecycle cannot introduce a state outside it. These constraints instead tie each terminal
-- timestamp to the status that produced it, so a row can never claim to be CANCELLED without a
-- cancelled_at, or carry a terminated_at while sitting in ACTIVE. CANCELLED and TERMINATED are
-- distinct states with distinct timestamps and this is where that distinction becomes structural.
ALTER TABLE placements
    ADD CONSTRAINT ck_placements_cancelled_at
        CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL)),
    ADD CONSTRAINT ck_placements_terminated_at
        CHECK ((status = 'TERMINATED') = (terminated_at IS NOT NULL)),
    ADD CONSTRAINT ck_placements_completed_at
        CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL));

-- ---------------------------------------------------------------- supervisor assignments

-- Supervisors are an append-only assignment history, NOT university_supervisor_id /
-- organization_supervisor_id columns on the placement (CLAUDE.md section 40). Reassignment stamps
-- removed_at on the current row and inserts a new one; nothing is ever deleted or overwritten, so
-- the record of who supervised the student over which period survives for evaluation and defense.
CREATE TABLE placement_supervisor_assignments (
    id                 UUID PRIMARY KEY,
    placement_id       UUID NOT NULL REFERENCES placements (id) ON DELETE CASCADE,
    supervisor_user_id UUID NOT NULL REFERENCES users (id),
    type               VARCHAR(20) NOT NULL,
    assigned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at         TIMESTAMPTZ,
    -- The staff member who performed the assignment, never the supervisor themselves.
    assigned_by        UUID NOT NULL REFERENCES users (id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    version            BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_psa_type CHECK (type IN ('UNIVERSITY', 'ORGANIZATION')),
    CONSTRAINT ck_psa_removed_after_assigned CHECK (removed_at IS NULL OR removed_at >= assigned_at)
);

-- At most ONE active supervisor of each type per placement (CLAUDE.md section 40). The service
-- layer closes the previous assignment inside the same transaction as it creates the new one, under
-- a row lock on the placement — but this partial unique index is the guarantee: even two admins
-- racing to assign different supervisors of the same type cannot both commit. Closed assignments
-- (removed_at NOT NULL) are excluded, so an unlimited history accumulates freely.
CREATE UNIQUE INDEX uk_psa_one_active_per_type
    ON placement_supervisor_assignments (placement_id, type)
    WHERE removed_at IS NULL;

-- Supervisor scope: "the placements I am currently responsible for" is the query behind every
-- UNIVERSITY_SUPERVISOR / ORGANIZATION_SUPERVISOR authorization check and listing.
CREATE INDEX idx_psa_active_supervisor
    ON placement_supervisor_assignments (supervisor_user_id)
    WHERE removed_at IS NULL;

-- Full history for one placement, for the supervisor history panel.
CREATE INDEX idx_psa_placement ON placement_supervisor_assignments (placement_id);
