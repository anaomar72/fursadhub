-- Truthful, server-derived testimonial attribution.
--
-- BEFORE: `author_role` held one of STUDENT / ORGANIZATION / UNIVERSITY and was chosen by the AUTHOR
-- in the submission form, alongside a free-text `author_affiliation`. A recruiter could therefore
-- publish a quote signed "Student · Jamhuriya University". That is the defect this migration exists
-- to close: attribution is now derived from the submitting account's real membership and role, and
-- the submission request no longer carries either field.
--
-- The rename is deliberate rather than a repurpose. The old column's values are the author's own
-- broad self-description, which is still meaningful and still true of the rows that hold it — it is
-- just not a ROLE. It becomes `author_audience` (STUDENT / ORGANIZATION / UNIVERSITY / PLATFORM),
-- which new submissions also populate, derived from the role rather than typed.
--
-- SNAPSHOT, not a live join (CLAUDE.md section 40's "preserve history" principle). A testimonial
-- says who the person was WHEN THEY WROTE IT. If a recruiter later becomes an organization
-- supervisor, or leaves the organization entirely, their published quote must keep saying
-- "Recruiter at Acme" rather than silently re-labelling itself — or worse, losing its attribution
-- when the membership row is revoked. So the role, the tenant reference and the tenant's display
-- name are all frozen into the row at submission.
ALTER TABLE testimonials RENAME COLUMN author_role TO author_audience;

-- NULLABLE, and nothing is backfilled. Rows written before this migration have no derived role: the
-- server never computed one for them, and the author's old self-description is a claim rather than a
-- fact the platform verified. Inventing "ORGANIZATION -> ORGANIZATION_ADMIN" would put a specific
-- job title on a real person that they never claimed and nobody checked. They keep their audience
-- label, the API reports authorRole as null, and the public card falls back to the audience wording.
-- New submissions always carry a role, enforced by the domain factory rather than by a NOT NULL
-- constraint that would make this migration unrunnable against a non-empty production table.
ALTER TABLE testimonials ADD COLUMN author_role varchar(40);

-- The tenant the author was acting for, when there is one: their organization or university.
-- `author_tenant_id` is the stable reference (useful for later analysis and for spotting orphans);
-- `author_affiliation`, which already exists, now holds the server-derived display snapshot rather
-- than free text the author typed. No foreign key: a testimonial must survive its tenant being
-- deleted with its attribution intact, which is exactly what an FK with ON DELETE would take away.
ALTER TABLE testimonials ADD COLUMN author_tenant_type varchar(20);
ALTER TABLE testimonials ADD COLUMN author_tenant_id uuid;

-- A tenant reference is either fully present or fully absent. A row carrying an id with no type
-- (or the reverse) is unattributable, and the application would have to guess how to render it.
ALTER TABLE testimonials ADD CONSTRAINT testimonials_tenant_pairing
    CHECK ((author_tenant_type IS NULL) = (author_tenant_id IS NULL));

-- No INSERT, no seed, no fabricated testimonials.
