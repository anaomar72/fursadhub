-- Phase 6: private file metadata (CLAUDE.md section 47).
--
-- Scope note: this is NOT the Phase 7 general-purpose file platform. It is the minimum secure
-- storage Phase 6 needs for one document type (the final report), and it is deliberately narrow:
-- no sharing, no retention workflow, no admin browser, no generic /files/{id} download route.
-- Access always goes through the owning business resource, which is what knows who may read it.
--
-- Document BYTES never live here. PostgreSQL stores only metadata; the object itself sits in
-- private S3-compatible storage under a random key that is never exposed to a browser.
CREATE TABLE stored_files (
    id UUID PRIMARY KEY,
    -- Random, unguessable, and never rendered into a URL. Even someone who obtains the key cannot
    -- fetch the object: the bucket is private and FursadHub issues no public or pre-signed URLs.
    storage_key VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    -- What the file IS, which decides which validation policy applied and who may read it.
    classification VARCHAR(40) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uk_stored_files_storage_key UNIQUE (storage_key),
    CONSTRAINT ck_stored_files_size CHECK (size_bytes > 0),
    -- Only the classifications Phase 6 actually uses. Phase 7 extends this list when it extends the
    -- module; an unrecognised classification cannot be smuggled in meanwhile.
    CONSTRAINT ck_stored_files_classification CHECK (classification IN ('FINAL_REPORT'))
);

CREATE INDEX idx_stored_files_uploaded_by ON stored_files (uploaded_by);
