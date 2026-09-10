-- Backend Phase B3: structured internship data the approved listing/detail experience needs —
-- what the internship pays, which skills it asks for, what it offers, and how many hours a week.
--
-- ADDITIVE ONLY. Every new column is nullable with no default and no backfill; the two new tables
-- start empty. No column is dropped, renamed, retyped or made NOT NULL, no existing row is
-- rewritten, and no state machine, visibility rule or authorization path is touched. An
-- opportunity created before B3 stays valid and simply reads as having no compensation, no skills,
-- no perks and no stated weekly commitment.

-- ---------------------------------------------------------------- compensation + time commitment

ALTER TABLE internship_opportunities
    -- Structured rather than one display string: the listing filters and renders on this, and
    -- "around $200/mo negotiable" can be neither compared nor translated into Somali.
    ADD COLUMN compensation_type       VARCHAR(20),
    -- ISO-4217. VARCHAR(3) rather than CHAR(3): PostgreSQL blank-pads CHAR, which gives surprising
    -- comparison semantics, and Hibernate's schema validation expects varchar for a String field.
    -- Validity is checked in Java against the JDK's ISO-4217 table, so no currency list is
    -- hardcoded here or in the application.
    ADD COLUMN compensation_currency   VARCHAR(3),
    -- NUMERIC, never floating point: money must not inherit binary rounding error. (12,2) allows up
    -- to 9,999,999,999.99, which comfortably covers any stipend in any currency FursadHub will see.
    --
    -- The SINGLE amount for a FIXED compensation lives in compensation_min_amount and max stays
    -- NULL, rather than writing the same number into both. Two copies of one value drift.
    ADD COLUMN compensation_min_amount NUMERIC(12, 2),
    ADD COLUMN compensation_max_amount NUMERIC(12, 2),
    ADD COLUMN compensation_period     VARCHAR(10),
    -- Weekly intensity. Genuinely new information: start_date/end_date already give DURATION and
    -- work_mode already gives LOCATION, but neither says whether this asks for 8 hours or 40.
    -- Deliberately NOT a FULL_TIME/PART_TIME enum — that is employment vocabulary, and it would
    -- also collide conceptually with work_mode (ONSITE/REMOTE/HYBRID).
    ADD COLUMN hours_per_week          INTEGER;

ALTER TABLE internship_opportunities
    ADD CONSTRAINT ck_internship_opportunities_compensation_type
        CHECK (compensation_type IS NULL OR compensation_type IN ('UNPAID', 'FIXED', 'RANGE', 'NEGOTIABLE')),
    ADD CONSTRAINT ck_internship_opportunities_compensation_period
        CHECK (compensation_period IS NULL OR compensation_period IN ('HOUR', 'DAY', 'WEEK', 'MONTH', 'TOTAL')),
    ADD CONSTRAINT ck_internship_opportunities_compensation_currency
        CHECK (compensation_currency IS NULL OR compensation_currency ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT ck_internship_opportunities_compensation_amounts
        CHECK (
            (compensation_min_amount IS NULL OR compensation_min_amount >= 0)
            AND (compensation_max_amount IS NULL OR compensation_max_amount >= 0)
            -- Ordering, whenever both are present. The type-specific rules (UNPAID carries no
            -- amount, FIXED carries no maximum, RANGE requires both) are enforced in the Compensation
            -- value object, which is where a violation can produce a readable field error; this
            -- constraint is the backstop for the two invariants that must hold no matter the type.
            AND (compensation_min_amount IS NULL OR compensation_max_amount IS NULL
                 OR compensation_min_amount <= compensation_max_amount)),
    -- Matches InternshipOpportunity.MIN/MAX_HOURS_PER_WEEK. Bounded well below the 168 hours a week
    -- contains: this rejects nonsense (a typo, a value entered in minutes), not demanding schedules.
    ADD CONSTRAINT ck_internship_opportunities_hours_per_week
        CHECK (hours_per_week IS NULL OR (hours_per_week >= 1 AND hours_per_week <= 80));

-- ---------------------------------------------------------------- authored value lists
--
-- Child tables rather than a comma-separated column, because the approved listing renders these as
-- individual chips and may filter on them: splitting "Java, SQL" in application code on every read
-- would make the value unindexable and would break the first time a value legitimately contains a
-- comma.
--
-- Shape follows screening_questions (V18), the collection pattern this repository already uses for
-- opportunity-owned rows: a plain opportunity_id UUID rather than a JPA association (the codebase
-- maps none anywhere), a 0-based gapless position, and a CHECK on the position range so the DATABASE
-- caps the row count per opportunity rather than trusting service logic alone.

CREATE TABLE opportunity_skills (
    id               UUID PRIMARY KEY,
    opportunity_id   UUID NOT NULL REFERENCES internship_opportunities (id) ON DELETE CASCADE,
    -- The organization's own spelling, shown on the listing.
    value            VARCHAR(60) NOT NULL,
    -- Case-folded form, so the database itself rejects "Java" alongside "java".
    normalized_value VARCHAR(60) NOT NULL,
    position         INTEGER NOT NULL,
    -- Caps the list at 20 per opportunity (positions 0..19).
    CONSTRAINT ck_opportunity_skills_position CHECK (position >= 0 AND position <= 19),
    CONSTRAINT ck_opportunity_skills_value_not_blank CHECK (btrim(value) <> ''),
    CONSTRAINT uk_opportunity_skills_position UNIQUE (opportunity_id, position),
    CONSTRAINT uk_opportunity_skills_normalized UNIQUE (opportunity_id, normalized_value)
);

CREATE INDEX idx_opportunity_skills_opportunity_id ON opportunity_skills (opportunity_id);

-- Supports a future "opportunities requiring skill X" lookup without a table scan. Added now
-- because it is the natural key for the only query this table will ever serve beyond loading a
-- single opportunity's list, and it costs one index on a table written only when an author edits a
-- draft.
CREATE INDEX idx_opportunity_skills_normalized_value ON opportunity_skills (normalized_value);

CREATE TABLE opportunity_perks (
    id               UUID PRIMARY KEY,
    opportunity_id   UUID NOT NULL REFERENCES internship_opportunities (id) ON DELETE CASCADE,
    value            VARCHAR(80) NOT NULL,
    normalized_value VARCHAR(80) NOT NULL,
    position         INTEGER NOT NULL,
    -- Caps the list at 15 per opportunity (positions 0..14).
    CONSTRAINT ck_opportunity_perks_position CHECK (position >= 0 AND position <= 14),
    CONSTRAINT ck_opportunity_perks_value_not_blank CHECK (btrim(value) <> ''),
    CONSTRAINT uk_opportunity_perks_position UNIQUE (opportunity_id, position),
    CONSTRAINT uk_opportunity_perks_normalized UNIQUE (opportunity_id, normalized_value)
);

CREATE INDEX idx_opportunity_perks_opportunity_id ON opportunity_perks (opportunity_id);

-- ---------------------------------------------------------------- deliberately NOT added
--
-- No index on compensation_type / compensation_min_amount. B3 captures this data; it does not add a
-- paid/unpaid or compensation-range filter to public discovery, so there is no query for such an
-- index to serve and it would only cost write amplification. The public discovery query is still
--   WHERE status = 'PUBLISHED' AND mode IN (...) AND EXISTS (verified owner) ...
-- and V-earlier indexes already serve it. Add these when a filter actually ships and EXPLAIN shows
-- the need (CLAUDE.md section 52: indexes for real query patterns, not blindly).
--
-- No skills reference/taxonomy table. These are opportunity-authored values, not a curated
-- vocabulary. If a taxonomy is ever needed the path is additive: create a skills table, add a
-- nullable skill_id FK to opportunity_skills, backfill by matching normalized_value, and keep this
-- column as the free-text fallback for anything unmatched.
