-- Minimal moderated testimonials (CLAUDE.md section 49 wording rules apply to legal text, not this).
-- Nothing is published by submission: only a platform moderator can move a row to PUBLISHED, and
-- only PUBLISHED rows are ever readable without a token. No seed rows are inserted, so a fresh
-- production database starts with an empty public testimonial list rather than invented content.
CREATE TABLE testimonials (
    id uuid PRIMARY KEY,
    author_user_id uuid NOT NULL REFERENCES users(id),
    author_display_name varchar(120) NOT NULL,
    author_role varchar(40) NOT NULL,
    author_affiliation varchar(160),
    body varchar(1000) NOT NULL,
    status varchar(40) NOT NULL,
    submitted_at timestamptz NOT NULL,
    moderated_by_user_id uuid REFERENCES users(id),
    moderated_at timestamptz,
    moderation_note varchar(1000)
);

-- One author, one testimonial awaiting or holding publication. A rejected one may be replaced,
-- which is why the constraint is partial rather than a plain UNIQUE(author_user_id).
CREATE UNIQUE INDEX testimonials_one_live_per_author_idx
    ON testimonials(author_user_id) WHERE status IN ('SUBMITTED', 'PUBLISHED');

CREATE INDEX testimonials_status_submitted_at_idx ON testimonials(status, submitted_at DESC);
