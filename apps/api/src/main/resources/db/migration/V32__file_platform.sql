-- Phase 7: the general private-file platform (CLAUDE.md sections 47-48).
--
-- Phase 6 created stored_files deliberately narrow: one classification (FINAL_REPORT), no retention
-- metadata, reachable only through the placement that owns it. Phase 7 widens it to the two other
-- document types CLAUDE.md section 47 names — the student's CV and university verification evidence
-- — and adds the retention metadata that section requires.
--
-- What does NOT change: bytes still never live in PostgreSQL, storage keys stay random, no public or
-- pre-signed URL is ever issued, and there is still no generic GET /api/v1/files/{id}. A document is
-- always reached through the business resource that owns it, because that resource is the only thing
-- that knows who may read it.

-- Retention metadata. FursadHub records how long a document is meant to be kept and why; it does NOT
-- delete anything automatically. An automated purge job is a data-retention WORKFLOW and belongs with
-- the rest of that policy work, not here — deleting a student's evidence out from under an open
-- verification case or a disputed placement would destroy records the platform is obliged to keep.
ALTER TABLE stored_files
    ADD COLUMN retention_category VARCHAR(40) NOT NULL DEFAULT 'STUDENT_RECORD',
    -- NULL means "retain while the owning record exists" — the normal case for academic documents,
    -- whose lifetime is the placement's or the enrollment's, not a fixed clock.
    ADD COLUMN retain_until DATE;

ALTER TABLE stored_files
    ADD CONSTRAINT ck_stored_files_retention_category
        CHECK (retention_category IN ('STUDENT_RECORD', 'VERIFICATION_EVIDENCE', 'ACADEMIC_RECORD'));

-- Extend the classification allowlist. The CHECK is the point: an unrecognised classification means
-- an upload path that no validation policy covers, so the database refuses it outright rather than
-- trusting that every Java call site remembered to validate.
ALTER TABLE stored_files DROP CONSTRAINT ck_stored_files_classification;
ALTER TABLE stored_files
    ADD CONSTRAINT ck_stored_files_classification
        CHECK (classification IN ('FINAL_REPORT', 'CV', 'VERIFICATION_EVIDENCE'));

-- The student's CV, hanging off their profile. Exactly one current CV per student: replacing it
-- writes a new object and repoints this column, and the old row is removed by the service.
ALTER TABLE student_profiles
    ADD COLUMN cv_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN cv_uploaded_at TIMESTAMPTZ;

-- University attestation evidence, hanging off the verification case (CLAUDE.md section 31:
-- "Verification evidence must remain private"). Readable ONLY by scoped university reviewers and
-- platform verification officers — never by any organization user, which is one of the mandatory
-- security tests in CLAUDE.md section 60.
ALTER TABLE student_verification_cases
    ADD COLUMN evidence_stored_file_id UUID REFERENCES stored_files (id),
    ADD COLUMN evidence_uploaded_at TIMESTAMPTZ;

CREATE INDEX idx_stored_files_classification ON stored_files (classification);
