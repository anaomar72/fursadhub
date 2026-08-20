# ADR-003: JWT Access Tokens + Rotating Opaque Refresh Tokens

## Status

Accepted (JWT validation/signing infrastructure prepared in Phase 0; the authentication business flow is implemented in Phase 1)

## Context

FursadHub needs stateless, horizontally-scalable authentication without server-side session storage, while still supporting secure long-lived sessions (a student should not have to re-login every 10 minutes) and strong protection against token theft/replay.

## Decision

Use a short-lived JWT access token paired with a rotating opaque refresh token:

- **Access token:** JWT, ~10 minute lifetime, RS256 (asymmetric) signing, validated via Spring Security's OAuth2 Resource Server support (signature, issuer, audience, expiration). Minimal claims only (`sub`, `iss`, `aud`, `iat`, `exp`, `jti`) — no sensitive student data in the token. Held only in React application memory; never written to `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. Sent as `Authorization: Bearer <token>`.
- **Refresh token:** not a JWT — a secure opaque random value, ~30 day lifetime, stored only as a hash in PostgreSQL, delivered via an `HttpOnly` (and `Secure` in production) cookie with an appropriate `SameSite` policy. Every successful refresh rotates the token (old token revoked, new token issued) and tracks a token family; replay of an already-used/revoked refresh token revokes the entire family and requires re-login.
- Current resource authorization (university/department/organization membership) is never decided from JWT claims alone — it is always re-checked against current PostgreSQL data, since membership can change between token issuance and use.

Configuration is environment-specific (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TOKEN_TTL`), with separate key pairs per environment (local/staging/production) and no private keys committed to the repository.

## Consequences

- No server-side session store is required, keeping the backend stateless and simple to scale.
- Short access-token lifetime limits the blast radius of a stolen access token; refresh-token rotation with replay detection limits the blast radius of a stolen refresh token.
- The frontend must handle silent refresh-on-app-start and 401-triggered refresh flows, and must never persist the access token outside memory.
- Refresh/logout endpoints are cookie-authenticated and therefore need deliberate CSRF/origin protection — CSRF is not blanket-disabled once these endpoints exist (see `CLAUDE.md` §21).
- Phase 0 prepares configuration keys and the resource-server dependency without wiring real login; Phase 1 implements the actual registration/login/refresh/logout business flow and the associated security tests.
