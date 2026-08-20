# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in FursadHub, please report it privately to the FursadHub team rather than opening a public issue. Do not disclose the issue publicly until it has been addressed.

## Authentication model

FursadHub uses:

- a short-lived (~10 minute) JWT access token, RS256-signed, held only in React application memory and sent as `Authorization: Bearer <token>`
- a rotating opaque refresh token (not a JWT), stored only as a hash in PostgreSQL, delivered to the browser as an `HttpOnly`, `Secure` (in production), `SameSite`-scoped cookie

Access tokens are never persisted to `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. Refresh-token reuse (replay of an already-rotated token) revokes the entire token family and requires re-authentication. See `CLAUDE.md` sections 14–21 for the full contract.

## Authorization model

Authorization always requires an authenticated actor **and** verification of current membership/role **and** resource scope from PostgreSQL — never from a role string or JWT claim alone. University and organization boundaries (department scope, organization membership) are enforced server-side; frontend route guards are UX only and are not a security boundary.

## Secrets

Never commit:

- production database credentials
- SMTP credentials
- object-storage credentials
- JWT private keys
- raw access/refresh/reset/verification tokens
- admin credentials

`.env.example` documents required variable names with no real values. Local secrets belong in a git-ignored `.env` file. Separate keys/credentials are used per environment (local, CI, staging, production).

## Sensitive data handling

- Verification evidence, final reports, and other private documents are stored in private S3-compatible object storage with random storage keys; permanent public URLs are never issued for private documents, and downloads require backend authorization.
- Passwords, JWTs, refresh/reset/verification tokens, `Authorization` headers, document contents, and signing keys are never written to logs.
- Sensitive private-file access is audited.

## Dependencies

Dependency updates are tracked through normal pull requests. CI blocks merges on failing builds/tests; dependency vulnerability review happens as part of Phase 8 production hardening.
