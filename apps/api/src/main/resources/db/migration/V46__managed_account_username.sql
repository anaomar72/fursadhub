-- Backend Phase B5.5: a login identifier for manually provisioned institution-managed staff.
--
-- ADDITIVE ONLY. One nullable column plus its constraints. email stays NOT NULL and UNIQUE, the
-- password schema is untouched, display_name (V45) is untouched, and no existing row is rewritten.
--
-- SCOPE: institution-managed staff only — RECRUITER, ORGANIZATION_SUPERVISOR,
-- DEPARTMENT_COORDINATOR, UNIVERSITY_SUPERVISOR. Students and self-registered founders keep email
-- login untouched, and platform roles (SUPER_ADMIN, VERIFICATION_OFFICER) are explicitly out of
-- scope: they are granted to already-existing self-service accounts, so there is no provisioning
-- flow to attach a username to. That is deferred to B5.6.

ALTER TABLE users
    -- Stored ONLY in canonical lowercase (UsernamePolicy.canonicalize). Because the canonical form
    -- is the only form ever written, a plain UNIQUE gives case-insensitive identity without CITEXT
    -- and without a lower(username) functional index — exactly how `email` already achieves it via
    -- EmailNormalizer. One convention for identifiers, not two.
    --
    -- NULLABLE, with no backfill and no default. Every account that exists today has no username:
    -- self-service accounts should never get one, and legacy managed staff keep logging in by email
    -- until their tenant admin assigns one. Deriving a username from an email local part would
    -- fabricate a credential the person never chose and cannot guess, and would collide the moment
    -- two institutions each employ an "ahmed".
    ADD COLUMN username VARCHAR(64);

ALTER TABLE users
    -- GLOBAL uniqueness, deliberately not per-tenant: authentication happens BEFORE any membership
    -- is known — there is one login screen and the tenant is only discoverable after the account is
    -- resolved — so a tenant-local "ahmed" would be unresolvable at the only moment it matters.
    --
    -- This constraint is the authority for the concurrent-provisioning race. The services check
    -- existence first for a friendly error, but two admins submitting the same username at the same
    -- instant are decided here, and only THIS constraint's violation becomes USERNAME_ALREADY_EXISTS.
    ADD CONSTRAINT uk_users_username UNIQUE (username),
    -- Mirrors UsernamePolicy.CANONICAL_REGEX: lowercase alphanumeric at both ends, single dots,
    -- underscores or hyphens only between alphanumerics, 3-64 characters. Enforced here as well as
    -- in Java so no path — a future service, a manual fix-up, a bad migration — can persist a
    -- non-canonical value that would then be unreachable by a canonicalized lookup.
    ADD CONSTRAINT ck_users_username_format
        CHECK (username IS NULL OR (
            length(username) BETWEEN 3 AND 64
            AND username ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'));

-- ---------------------------------------------------------------- deliberately NOT added
--
-- No separate index: PostgreSQL implements UNIQUE with a b-tree index, and login resolves by exact
-- canonical equality, so uk_users_username already serves the only query there is.
--
-- No CITEXT: not installed, not used anywhere in this schema, and unnecessary once the canonical
-- form is the only form stored.
--
-- No functional lower(username) index: same reason.
--
-- No NOT NULL, now or by later backfill. Most accounts must never have a username, so the column is
-- permanently nullable by design rather than as a transition compromise.
--
-- No cross-column constraint forbidding username == some other user's email local part. A username
-- can never be confused with an email because '@' is impossible in a username, which is what makes
-- the single login field deterministic.
