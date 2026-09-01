-- Phase 7.5: institution verification evidence (CLAUDE.md sections 26, 31, 47).
--
-- Until now an organization could submit itself for verification with nothing attached, leaving a
-- platform reviewer with no document to actually review. Evidence lives directly on the tenant row
-- rather than in a separate case table because institution verification status already does — the
-- student equivalent is modelled differently (student_verification_cases) because a student's case
-- is decoupled from their enrollment record.

-- The classification whitelist is maintained in lockstep with the FileClassification enum, exactly
-- as V28 anticipated ("Phase 7 extends this list when it extends the module") and V32 then did. The
-- database refuses a classification no upload policy covers rather than trusting that every Java
-- call site remembered to validate — which means adding an enum constant without extending this
-- constraint makes that upload path fail at the database, as it should.
ALTER TABLE stored_files DROP CONSTRAINT ck_stored_files_classification;
ALTER TABLE stored_files
    ADD CONSTRAINT ck_stored_files_classification
        CHECK (classification IN (
            'FINAL_REPORT',
            'CV',
            'VERIFICATION_EVIDENCE',
            'ORGANIZATION_VERIFICATION_EVIDENCE',
            'UNIVERSITY_VERIFICATION_EVIDENCE'));

ALTER TABLE organizations
    ADD COLUMN evidence_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN evidence_uploaded_at TIMESTAMPTZ;

-- Universities become self-registering in this phase, so they gain the profile columns organizations
-- already had (nullable: the Jamhuriya pilot row predates them) alongside the same evidence pointer.
ALTER TABLE universities
    ADD COLUMN registration_number VARCHAR(120),
    ADD COLUMN website VARCHAR(255),
    ADD COLUMN description VARCHAR(2000),
    ADD COLUMN verified_at TIMESTAMPTZ,
    ADD COLUMN evidence_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN evidence_uploaded_at TIMESTAMPTZ;

-- The seeded pilot tenant was created already VERIFIED by V10; give it a verified_at so the column
-- is consistent for every verified row rather than null only for the one that predates this change.
UPDATE universities SET verified_at = created_at WHERE status = 'VERIFIED' AND verified_at IS NULL;
