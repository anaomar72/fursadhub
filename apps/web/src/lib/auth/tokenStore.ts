/**
 * In-memory-only access token store.
 *
 * CLAUDE.md section 15: JWT access tokens must never be persisted to
 * localStorage, sessionStorage, IndexedDB, or cookies — memory only, cleared
 * on full page reload. Module-scoped (rather than React state) so the plain
 * fetch wrapper in lib/api/client.ts can read the current token outside the
 * React tree without a circular dependency on a hook/context.
 *
 * <p>The session epoch changes every time a session ends or a new one begins. Anything asynchronous
 * that started under one session — a silent refresh above all — compares the epoch it started in
 * before writing its result, so a response that arrives after sign-out can never reinstate the
 * previous account's token.
 */

let accessToken: string | null = null
let sessionEpoch = 0

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getSessionEpoch(): number {
  return sessionEpoch
}

/** Marks a session boundary (sign-in or sign-out): in-flight work from the old session goes stale. */
export function beginNewSessionEpoch(): void {
  sessionEpoch += 1
}
