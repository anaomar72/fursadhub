/**
 * Deduplicates concurrent access-token refresh attempts (CLAUDE.md section 18). The refresh
 * function itself is registered by {@link AuthProvider} on mount (it needs the auth API + token
 * store), while lib/api/client.ts calls {@link refreshAccessToken} whenever a request comes back
 * 401 — both call sites share the same in-flight promise so a burst of expired requests only
 * triggers one POST /api/v1/auth/refresh.
 *
 * <p>Refresh is suspended from an explicit sign-out until the next sign-in. Between the local
 * sign-out and the server revoking the refresh cookie, a stray 401 would otherwise "silently
 * refresh" straight back into the account that just left — and if the logout request fails, that
 * cookie can outlive the sign-out entirely.
 */

let refreshFn: (() => Promise<string | null>) | null = null
let inFlight: Promise<string | null> | null = null
let suspended = false

export function registerRefreshFn(fn: () => Promise<string | null>): void {
  refreshFn = fn
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshFn || suspended) {
    return Promise.resolve(null)
  }
  if (!inFlight) {
    const attempt: Promise<string | null> = refreshFn().finally(() => {
      // Only clear our own slot: a sign-out may already have dropped it and a new session started.
      if (inFlight === attempt) inFlight = null
    })
    inFlight = attempt
  }
  return inFlight
}

/** Called on explicit sign-out. Any refresh already in flight is discarded by the session epoch. */
export function suspendRefresh(): void {
  suspended = true
  inFlight = null
}

/** Called on sign-in, once a new session exists to be refreshed. */
export function resumeRefresh(): void {
  suspended = false
}

let pendingLogout: Promise<void> = Promise.resolve()

/**
 * Records a logout request in flight. Its response clears the refresh cookie, so a login sent
 * meanwhile could have its fresh cookie wiped by that late `Set-Cookie` — logins wait for it first.
 */
export function trackLogout(request: Promise<unknown>): Promise<void> {
  const settled = request.then(
    () => undefined,
    () => undefined,
  )
  pendingLogout = Promise.all([pendingLogout, settled]).then(() => undefined)
  return settled
}

export function waitForPendingLogout(): Promise<void> {
  return pendingLogout
}
