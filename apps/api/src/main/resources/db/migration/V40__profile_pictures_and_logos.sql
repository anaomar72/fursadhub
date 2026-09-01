-- Phase 8: profile pictures for every user, plus organization/university logos so institutions can
-- present their own brand identity — paired with the verified badge on their public profile page.
--
-- Both CHECK constraints on stored_files are extended together this time: V38 extended only the
-- classification allowlist and missed the retention-category one is a SEPARATE constraint, which is
-- exactly the bug that caused every license upload to 500 until it was found and fixed.
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
            'UNIVERSITY_LOGO'));

ALTER TABLE stored_files DROP CONSTRAINT ck_stored_files_retention_category;
ALTER TABLE stored_files
    ADD CONSTRAINT ck_stored_files_retention_category
        CHECK (retention_category IN ('STUDENT_RECORD', 'VERIFICATION_EVIDENCE', 'ACADEMIC_RECORD', 'ACCOUNT_ASSET'));

ALTER TABLE users
    ADD COLUMN avatar_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN avatar_uploaded_at TIMESTAMPTZ;

ALTER TABLE organizations
    ADD COLUMN logo_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN logo_uploaded_at TIMESTAMPTZ;

ALTER TABLE universities
    ADD COLUMN logo_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN logo_uploaded_at TIMESTAMPTZ;
