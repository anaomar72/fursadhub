-- Backend Phase B5: a human-readable display identity for managed institution staff.
--
-- ADDITIVE ONLY. One nullable column; nothing existing is dropped, renamed, retyped, made NOT NULL
-- or rewritten. No backfill and no default, deliberately: see below.

ALTER TABLE users
    -- Presentation identity ONLY. This is never an identifier: it is not unique, no query looks an
    -- account up by it, and it takes no part in authentication. Email remains the account/contact
    -- and login field, and the future username phase will add its own login identifier separately.
    --
    -- Nullable with NO BACKFILL on purpose. Every account that exists today has no display name, and
    -- there is no honest value to invent for them:
    --   * deriving "John Smith" from john.smith@example.com fabricates a person's name from a string
    --     that is not required to contain one — and quietly gets it wrong for shared, initialled or
    --     non-Latin addresses;
    --   * a placeholder like 'Staff User' or the role name is worse than null, because null lets the
    --     UI fall back to the email it already shows, while a fake name looks authoritative.
    -- Historical rows therefore stay NULL until an authorized tenant admin supplies a real name.
    ADD COLUMN display_name VARCHAR(255);

-- ---------------------------------------------------------------- deliberately NOT added
--
-- No index. B5 adds no search, sort or lookup by display_name — the staff list is already scoped to
-- one tenant's memberships and reads the user row it has already joined. An index here would serve
-- no query and cost write amplification on every account update. Add one if person search ever
-- ships (CLAUDE.md section 52: indexes for real query patterns, not blindly).
--
-- No UNIQUE constraint. Two staff members may legitimately share a name, and uniqueness would imply
-- this is an identifier, which is exactly what it must not become.
--
-- No NOT NULL, now or later by backfill. See above.
--
-- student_profiles.full_name is untouched. Students keep their own self-managed name; B5 does not
-- copy, synchronise or supersede it, and deliberately leaves the broader "one canonical name per
-- human" question open rather than answering it by side effect.
