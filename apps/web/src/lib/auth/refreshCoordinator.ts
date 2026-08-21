/**
 * Deduplicates concurrent access-token refresh attempts (CLAUDE.md section 18). The refresh
 * function itself is registered by {@link AuthProvider} on mount (it needs the auth API + token
 * store), while lib/api/client.ts calls {@link refreshAccessToken} whenever a request comes back
 * 401 — both call sites share the same in-flight promise so a burst of expired requests only
 * triggers one POST /api/v1/auth/refresh.
 */

let refreshFn: (() => Promise<string | null>) | null = null
let inFlight: Promise<string | null> | null = null

export function registerRefreshFn(fn: () => Promise<string | null>): void {
  refreshFn = fn
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshFn) {
    return Promise.resolve(null)
  }
  if (!inFlight) {
    inFlight = refreshFn().finally(() => {
      inFlight = null
    })
  }
  return inFlight
}
