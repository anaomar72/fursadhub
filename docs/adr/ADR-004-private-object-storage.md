# ADR-004: Private S3-Compatible Object Storage

## Status

Accepted (backend/frontend implementation begins in Phase 7)

## Context

FursadHub stores sensitive documents — CVs, final reports, university/organization verification evidence — that must never be publicly accessible, must be size/MIME-validated, and must have their access audited.

## Decision

Store document bytes in private S3-compatible object storage (MinIO locally, a managed S3-compatible provider in staging/production), never in PostgreSQL. PostgreSQL stores only metadata: file UUID, storage key, original filename, MIME type, size, classification, uploader, ownership context, and retention metadata.

- Storage keys are random, not derived from user-supplied filenames.
- No permanent public URLs are issued for private documents; every download is mediated by a backend authorization check.
- Upload validation is purpose-specific (e.g. CV: PDF only; verification evidence: PDF or approved image types), with a reasonable max size, and arbitrary executable/archive uploads are rejected.
- Access to sensitive files is auditable (`PRIVATE_FILE_ACCESSED`).

## Consequences

- Keeping large binary content out of PostgreSQL keeps the database small, fast to back up, and fast to restore.
- Every file download requires a backend round-trip for authorization, which is a deliberate trade-off against the convenience of direct public URLs — this is required given the sensitivity of the documents involved (verification evidence, final reports).
- Local development requires an S3-compatible service (MinIO) as part of `infra/compose.yaml`, mirroring the production storage contract without depending on a specific cloud provider.
