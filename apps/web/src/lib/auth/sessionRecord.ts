/**
 * This browser's record of the current sign-in, shared by every FursadHub tab through localStorage.
 *
 * <p><strong>It holds no credential.</strong> The id is a random label for "one sign-in in this
 * browser", generated here and never sent to the API; the access token stays in memory
 * (tokenStore.ts) and the refresh token stays in its HttpOnly cookie (CLAUDE.md sections 15, 17).
 *
 * <p>It does two jobs:
 * <ul>
 *   <li><strong>Sign-out barrier.</strong> An explicit sign-out writes `signed-out`. On the next app
 *       start, AuthProvider sees it and does NOT silently refresh: if the logout request never
 *       reached the server, the refresh cookie may still be valid, and refreshing from it would
 *       bring back the account the person deliberately left. Only an explicit sign-in replaces it.</li>
 *   <li><strong>Cross-tab signal.</strong> Writing the record fires a `storage` event in every other
 *       tab of this browser profile, so a sign-out in one tab ends the session in all of them, and a
 *       sign-in elsewhere replaces the session a tab was showing. Events carry the session id, so a
 *       late `signed-out` for an old sign-in can never end a newer one.</li>
 * </ul>
 *
 * <p>Every storage access tolerates a browser that refuses storage: the app then behaves exactly as
 * it did before this record existed, which is the documented residual risk.
 */

export const SESSION_RECORD_KEY = 'fursadhub-auth-session'

export interface SessionRecord {
  id: string
  status: 'active' | 'signed-out'
}

export function parseSessionRecord(raw: string | null): SessionRecord | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<SessionRecord>
    if (typeof value.id === 'string' && (value.status === 'active' || value.status === 'signed-out')) {
      return { id: value.id, status: value.status }
    }
  } catch {
    // A malformed record is treated as no record.
  }
  return null
}

export function readSessionRecord(): SessionRecord | null {
  try {
    return parseSessionRecord(window.localStorage.getItem(SESSION_RECORD_KEY))
  } catch {
    return null
  }
}

export function writeSessionRecord(record: SessionRecord): void {
  try {
    window.localStorage.setItem(SESSION_RECORD_KEY, JSON.stringify(record))
  } catch {
    // Storage refused: no barrier and no cross-tab signal, but the in-tab sign-out still holds.
  }
}

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/** Calls `listener` when ANOTHER tab changes the record. The `storage` event never fires in the writer. */
export function subscribeToSessionRecord(listener: (record: SessionRecord | null) => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_RECORD_KEY) listener(parseSessionRecord(event.newValue))
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/**
 * The `sub` claim of an access token, read only to tell whether two tokens belong to the same
 * account. Not verified, and never used to authorize anything — the backend does that.
 */
export function tokenSubject(token: string | null): string | null {
  const payload = token?.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const claims = JSON.parse(atob(base64)) as { sub?: unknown }
    return typeof claims.sub === 'string' ? claims.sub : null
  } catch {
    return null
  }
}
