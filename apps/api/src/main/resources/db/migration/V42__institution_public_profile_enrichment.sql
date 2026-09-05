-- Backend Phase B2: real, institution-managed public-profile data for organizations and
-- universities, so a public profile can answer "would I want to intern here?" from data the
-- institution actually owns rather than from anything invented.
--
-- ADDITIVE ONLY. Every column is nullable with no default and no backfill, so existing production
-- rows stay valid and every new field simply reads as absent until its owner fills it in. No column
-- is dropped, renamed, retyped or made NOT NULL; no data is rewritten; no state machine is touched.

-- ---------------------------------------------------------------- organization profile

ALTER TABLE organizations
    -- Free text, NOT an enum: industry is open-ended and the approved profile needs the
    -- organization's own words ("Telecommunications", "NGO / Humanitarian"). See the note at the
    -- bottom for the upgrade path if this ever needs to become a faceted, translated vocabulary.
    ADD COLUMN industry             VARCHAR(120),
    -- Structured location rather than one display string, so the directory can filter on it.
    -- Mirrors universities.city, which already exists with the same type and length.
    ADD COLUMN city                 VARCHAR(120),
    -- ISO-3166-1 alpha-2. A CODE rather than a country name because the name must be renderable in
    -- both English and Somali (CLAUDE.md section 56) — storing one language's spelling would make
    -- the other a lookup anyway, and would make filtering depend on how a name was typed.
    --
    -- VARCHAR(2), not CHAR(2): PostgreSQL blank-pads CHAR, which gives surprising comparison and
    -- trailing-space semantics for a value used as an equality filter. The regex CHECK below gives
    -- the fixed-width guarantee without the padding, and it is what Hibernate's schema validation
    -- expects for a String field (ddl-auto=validate rejects bpchar against varchar).
    ADD COLUMN country_code         VARCHAR(2),
    -- The one-line summary a directory card needs. `description` already exists at 2000 characters
    -- and is the full profile body; it is reused unchanged rather than duplicated.
    ADD COLUMN short_description    VARCHAR(200),
    ADD COLUMN company_size_range   VARCHAR(20),
    -- A year, not a date: organizations know the year they were founded, not the day. INTEGER rather
    -- than SMALLINT so it matches the Java Integer field under ddl-auto=validate; the two bytes saved
    -- would not have been worth a type mismatch.
    ADD COLUMN founded_year         INTEGER,
    -- Explicit nullable columns rather than a JSON blob: the repository has no typed
    -- JSON-value-object pattern, and four named columns can each be validated and length-bounded.
    ADD COLUMN linkedin_url         VARCHAR(255),
    ADD COLUMN x_url                VARCHAR(255),
    ADD COLUMN instagram_url        VARCHAR(255),
    ADD COLUMN youtube_url          VARCHAR(255),
    -- Same managed-file lifecycle as the logo (V40): a pointer into stored_files, never bytes in
    -- this table and never an arbitrary external image URL.
    ADD COLUMN cover_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN cover_uploaded_at    TIMESTAMPTZ;

ALTER TABLE organizations
    ADD CONSTRAINT ck_organizations_company_size_range CHECK (company_size_range IS NULL OR company_size_range IN (
        'SIZE_1_10', 'SIZE_11_50', 'SIZE_51_200', 'SIZE_201_500',
        'SIZE_501_1000', 'SIZE_1001_5000', 'SIZE_5001_PLUS')),
    -- Uppercase two-letter code.
    ADD CONSTRAINT ck_organizations_country_code CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
    -- Fixed bounds only. A CHECK cannot call now()/EXTRACT(now()) — PostgreSQL requires IMMUTABLE
    -- expressions — so "not in the future" is enforced in the domain against the injected Clock
    -- (common/config/ClockConfig), and this constraint catches anything absurd that bypasses it.
    ADD CONSTRAINT ck_organizations_founded_year CHECK (founded_year IS NULL OR founded_year BETWEEN 1800 AND 2200);

-- ---------------------------------------------------------------- university profile

-- `city`, `website` and `description` already exist (V9, V38) and are reused unchanged.
ALTER TABLE universities
    ADD COLUMN country_code         VARCHAR(2),
    -- An institution-managed public address (careers@, internships@) that the university chooses to
    -- publish. Never defaulted from any user account — see UniversityProfileFields.
    ADD COLUMN public_contact_email  VARCHAR(320),
    ADD COLUMN cover_stored_file_id  UUID REFERENCES stored_files (id),
    ADD COLUMN cover_uploaded_at     TIMESTAMPTZ;

ALTER TABLE universities
    ADD CONSTRAINT ck_universities_country_code CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

-- ---------------------------------------------------------------- cover file classifications
--
-- Both stored_files CHECK constraints are examined together on purpose. V38 extended only the
-- classification allowlist and missed that ck_stored_files_retention_category is a SEPARATE
-- constraint, which broke every license upload until V40 found it.
--
-- This time only the classification list actually needs to change: ACCOUNT_ASSET — the retention
-- category both cover types use — was already added to the retention constraint by V40, so that
-- constraint is deliberately left alone. The migration test asserts BOTH constraints accept a cover
-- row, so a wrong assumption here fails loudly rather than at the first upload.
ALTER TABLE stored_files DROP CONSTRAINT ck_stored_files_classification;
ALTER TABLE stored_files
    ADD CONSTRAINT ck_stored_files_classification
        CHECK (classification IN (
            'FINAL_REPORT',
            'CV',
            'VERIFICATION_EVIDENCE',
            'ORGANIZATION_VERIFICATION_EVIDENCE',
            'UNIVERSITY_VERIFICATION_EVIDENCE',
            'PROFILE_PICTURE',
            'ORGANIZATION_LOGO',
            'UNIVERSITY_LOGO',
            'ORGANIZATION_COVER',
            'UNIVERSITY_COVER'));

-- ---------------------------------------------------------------- indexes: deliberately none
--
-- industry, city and country_code become real directory filters in this phase, so the question was
-- asked properly rather than answered by reflex.
--
-- The organization directory query is:
--   WHERE verification_status = 'VERIFIED' AND (type) AND (industry) AND (city) AND (country_code)
--     AND LOWER(name) LIKE '%fragment%'  ORDER BY name
--
-- V41's idx_organizations_verification_status_name already leads with the fixed VERIFIED
-- precondition and supplies the ORDER BY, so PostgreSQL walks the verified rows in name order and
-- applies the remaining predicates as cheap heap filters with no sort step. A separate
-- (verification_status, industry) or (verification_status, city) index would force the planner to
-- choose between filtering and sorting; on the verified subset — tens to low hundreds of rows for
-- the pilot — it would lose to the existing index and never be used, while still costing write
-- amplification on every profile save.
--
-- Add them when the evidence appears, not before: when verified institutions reach roughly five
-- figures, or when EXPLAIN ANALYZE on the real directory query shows a sort or filter node
-- dominating. The same reasoning V41 recorded for name search still holds — LOWER(name) LIKE
-- '%fragment%' is a leading wildcard that no b-tree can serve, and pg_trgm + GIN is the upgrade,
-- not a search service (CLAUDE.md section 3).
