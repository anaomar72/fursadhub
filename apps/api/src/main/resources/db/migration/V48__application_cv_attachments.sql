-- Historical candidacies keep their previous CV behavior. New self-applications bind one immutable file.
ALTER TABLE candidacies ADD COLUMN application_cv_stored_file_id uuid REFERENCES stored_files(id);
CREATE TABLE application_cv_uploads (
    id uuid PRIMARY KEY,
    student_user_id uuid NOT NULL REFERENCES users(id),
    opportunity_id uuid NOT NULL REFERENCES internship_opportunities(id),
    stored_file_id uuid NOT NULL UNIQUE REFERENCES stored_files(id),
    candidacy_id uuid UNIQUE REFERENCES candidacies(id),
    created_at timestamptz NOT NULL
);
CREATE INDEX application_cv_uploads_owner_idx ON application_cv_uploads(student_user_id, opportunity_id);
