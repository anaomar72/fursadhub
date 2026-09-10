-- A real 1-5 star rating on testimonials.
--
-- The column is NULLABLE on purpose, and nothing is backfilled. Rows written before rating support
-- existed carry no rating, and there is no honest value to invent for them: assigning 5 would put a
-- score in a real person's mouth that they never gave, and any other default would be equally made
-- up. They stay NULL, the API reports them as unrated, and the public card renders without a star
-- row. New submissions are required to carry a rating, but that requirement belongs to the
-- submission path (the domain factory and the request DTO both enforce it) rather than to a NOT NULL
-- constraint that would make this migration unrunnable against a non-empty production table.
--
-- The CHECK is the database-level invariant behind the Java validation (CLAUDE.md section 52):
-- a rating is either absent or genuinely within 1-5, whatever writes it.
-- `integer`, not `smallint`: the entity maps this as a Java Integer, and the project runs Hibernate
-- with `ddl-auto=validate` (CLAUDE.md section 52), which rejects int2 against Integer. Matching the
-- types here keeps the validation honest rather than loosening it, and five possible values cost
-- nothing either way.
ALTER TABLE testimonials ADD COLUMN rating integer;

ALTER TABLE testimonials ADD CONSTRAINT testimonials_rating_range
    CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

-- No INSERT, no UPDATE, no seed. An existing database keeps exactly the testimonials its real users
-- wrote, and a fresh one starts empty.
