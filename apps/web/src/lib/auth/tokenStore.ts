/**
 * In-memory-only access token store.
 *
 * CLAUDE.md section 15: JWT access tokens must never be persisted to
 * localStorage, sessionStorage, IndexedDB, or cookies — memory only, cleared
 * on full page reload. Module-scoped (rather than React state) so the plain
 * fetch wrapper in lib/api/client.ts can read the current token outside the
 * React tree without a circular dependency on a hook/context.
 *
 * Real login/refresh wiring happens in Phase 1; this only prepares the slot.
 */

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}
