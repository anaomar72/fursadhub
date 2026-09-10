-- New claims can attach private Student ID evidence before a review case exists.
-- Existing submitted cases retain their evidence and status; no historical backfill.
ALTER TABLE student_enrollments ADD COLUMN draft_evidence_stored_file_id uuid
    REFERENCES stored_files(id);
