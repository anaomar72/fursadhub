-- Backend Phase B4: saved internships (bookmarks) for students.
--
-- ADDITIVE ONLY. One new table; no existing table, column, constraint or row is touched. Nothing in
-- candidacies, applications, nominations, placements, verification states or the opportunity state
-- machine changes — a bookmark is private preference data and takes no part in candidate intake.

CREATE TABLE student_saved_opportunities (
    id              UUID PRIMARY KEY,
    -- users (id) is the canonical student identity for student-owned data throughout this schema:
    -- student_enrollments, nominations, candidacies and placements all reference it under exactly
    -- this column name, and student_profiles is itself keyed by the user id. Using the profile as a
    -- separate surrogate would have introduced a second student identity for no gain.
    --
    -- ON DELETE CASCADE: a deleted account's private bookmarks have no meaning and must not outlive
    -- it. Same rule the other student-owned tables already use.
    student_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- ON DELETE CASCADE: a bookmark pointing at a deleted opportunity is unresolvable, so it goes
    -- with it. Matches how candidacies and the B3 value lists reference the opportunity.
    opportunity_id  UUID NOT NULL REFERENCES internship_opportunities (id) ON DELETE CASCADE,
    saved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- THE invariant: one student never holds two bookmarks for the same opportunity. This is the
    -- authority behind the idempotent save — the application checks first for the ordinary repeat
    -- click, but two concurrent requests are decided here, and the loser is treated as a no-op
    -- rather than surfacing as a 500.
    CONSTRAINT uk_student_saved_opportunities UNIQUE (student_user_id, opportunity_id)
);

-- The Saved Internships list: this student's rows, newest save first. DESC matches the query's
-- ORDER BY exactly so PostgreSQL can walk the index rather than sort.
--
-- The unique constraint above already provides a student_user_id-leading index, but it orders by
-- opportunity_id, which the list never asks for; it cannot supply this ordering.
CREATE INDEX idx_student_saved_opportunities_student_saved_at
    ON student_saved_opportunities (student_user_id, saved_at DESC);

-- PostgreSQL does NOT index the referencing side of a foreign key automatically. Without this,
-- deleting an opportunity would sequentially scan this table to find dependent rows to cascade —
-- and opportunity deletion is exactly when that scan happens. It also serves the join in the saved
-- list, whose other side is internship_opportunities.id.
CREATE INDEX idx_student_saved_opportunities_opportunity_id
    ON student_saved_opportunities (opportunity_id);

-- ---------------------------------------------------------------- deliberately NOT added
--
-- No index on saved_at alone: nothing queries bookmarks across all students, and B4 adds no
-- platform-wide or administrative view of student preferences.
--
-- No visibility-related column. Whether a saved opportunity is currently discoverable is derived at
-- query time from the opportunity's status/mode and its organization's live verification status —
-- the canonical B1.5 rule — never stored here. Persisting it would have to be invalidated on every
-- suspension or publish, and would let a bookmark's copy of the truth drift from the truth.
