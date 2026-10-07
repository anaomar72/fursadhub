import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { beginNewSessionEpoch, getAccessToken, getSessionEpoch, setAccessToken } from './tokenStore'
import {
  refreshAccessToken,
  registerRefreshFn,
  resumeRefresh,
  suspendRefresh,
  trackLogout,
} from './refreshCoordinator'
import {
  newSessionId,
  readSessionRecord,
  subscribeToSessionRecord,
  tokenSubject,
  writeSessionRecord,
} from './sessionRecord'
import * as authApi from '../../features/auth/api/authApi'

interface AuthContextValue {
  accessToken: string | null
  isAuthenticated: boolean
  /** True until the initial silent refresh-on-app-start attempt has resolved. */
  isInitializing: boolean
  /**
   * True from an explicit sign-out until the next sign-in. Route guards read it to avoid carrying
   * the departed account's last protected page into the next person's sign-in.
   */
  signedOut: boolean
  signIn: (token: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Drops every trace of the current session from the client, synchronously.
 *
 * <p>The TanStack Query cache is the only place server state lives (CLAUDE.md section 8), and its
 * keys are not scoped to a user — `['me']`, `['admin', 'session']`, `['organization',
 * 'my-memberships']` and the rest mean "the caller". So the cache must be emptied at every identity
 * boundary, or the next account renders the previous one's identity, tenant, navigation and data
 * from cache while its own requests are still in flight. `clear()` also cancels in-flight queries
 * and drops mutation results (one-time staff credentials among them).
 *
 * <p>The cache is emptied before the React state flips, so the render that follows can only see
 * an empty cache.
 */
function endSession(queryClient: QueryClient) {
  beginNewSessionEpoch()
  setAccessToken(null)
  queryClient.clear()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken)
  const [isInitializing, setIsInitializing] = useState(true)
  // Behind the sign-out barrier this is still the explicit sign-out, a reload later: a protected
  // page reached now (Back, history) belonged to the account that left, so the next sign-in must not
  // be sent there.
  const [signedOut, setSignedOut] = useState(() => readSessionRecord()?.status === 'signed-out')
  /** The sign-in this tab is showing (see sessionRecord.ts), or null while signed out. */
  const sessionIdRef = useRef<string | null>(null)

  /** Ends this tab's session because the person signed out — in this tab or in another one. */
  const endSessionBySignOut = useCallback(() => {
    suspendRefresh()
    endSession(queryClient)
    sessionIdRef.current = null
    setSignedOut(true)
    setAccessTokenState(null)
  }, [queryClient])

  useEffect(() => {
    const attemptRefresh = async (): Promise<string | null> => {
      // A sign-in or sign-out while this request is out makes its answer belong to a session that
      // no longer exists — it must not overwrite the token, nor end the session that replaced it.
      const epoch = getSessionEpoch()
      const previousToken = getAccessToken()
      const hadSession = previousToken !== null
      try {
        const result = await authApi.refresh()
        if (epoch !== getSessionEpoch()) return null

        const record = readSessionRecord()
        if (record?.status === 'signed-out') {
          // Another tab signed out while this request was out, and its event has not reached this
          // tab yet. The answer must not outlive that sign-out — nor overwrite its barrier.
          endSessionBySignOut()
          return null
        }
        if (hadSession && tokenSubject(previousToken) !== tokenSubject(result.accessToken)) {
          // The cookie now belongs to a different account (signed in from another tab): nothing
          // cached for the previous one may be shown under the new one.
          endSession(queryClient)
        }
        if (record) {
          sessionIdRef.current = record.id
        } else {
          // A session from before this record existed: give it one so every tab agrees on it.
          sessionIdRef.current = newSessionId()
          writeSessionRecord({ id: sessionIdRef.current, status: 'active' })
        }
        setAccessToken(result.accessToken)
        setAccessTokenState(result.accessToken)
        return result.accessToken
      } catch {
        if (epoch !== getSessionEpoch()) return null
        if (hadSession) {
          // The session expired or was revoked elsewhere: its cached data goes with it.
          endSession(queryClient)
        } else {
          setAccessToken(null)
        }
        sessionIdRef.current = null
        setAccessTokenState(null)
        return null
      }
    }

    // Shared with lib/api/client.ts, which calls this on any 401 from a non-auth endpoint.
    registerRefreshFn(attemptRefresh)

    let cancelled = false
    const finishInitializing = () => {
      if (!cancelled) setIsInitializing(false)
    }

    if (readSessionRecord()?.status === 'signed-out') {
      // The sign-out barrier. This browser was explicitly signed out, so a refresh cookie that
      // survived — because the logout request never reached the server — must not silently bring
      // that account back. Retry the server-side revocation instead, and start signed out. An
      // explicit sign-in replaces the record and lifts the barrier.
      suspendRefresh()
      void trackLogout(authApi.logout())
      finishInitializing()
    } else {
      // Go through the coordinator rather than calling attemptRefresh() directly: under StrictMode
      // this effect runs twice on mount, and two direct calls would send the same refresh token
      // twice. The second send replays an already-rotated token, which the backend correctly treats
      // as theft and revokes the whole family (CLAUDE.md section 18) — logging the user straight
      // back out. The coordinator collapses both into one in-flight POST.
      refreshAccessToken().finally(finishInitializing)
    }
    return () => {
      cancelled = true
    }
  }, [queryClient, endSessionBySignOut])

  // Other tabs of this browser. Only a change that concerns the sign-in THIS tab is showing acts:
  // a stale `signed-out` for an earlier sign-in never ends a newer one.
  useEffect(
    () =>
      subscribeToSessionRecord((record) => {
        const current = sessionIdRef.current
        if (!record || !current) return

        if (record.status === 'signed-out' && record.id === current) {
          endSessionBySignOut()
          return
        }
        if (record.status === 'active' && record.id !== current) {
          // Someone signed in from another tab, and the refresh cookie now belongs to that sign-in.
          // Drop everything this tab held, then re-establish from the cookie — showing the loading
          // state meanwhile, never the previous account's workspace.
          endSession(queryClient)
          sessionIdRef.current = null
          setAccessTokenState(null)
          setIsInitializing(true)
          resumeRefresh()
          void refreshAccessToken().finally(() => setIsInitializing(false))
        }
      }),
    [queryClient, endSessionBySignOut],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      isInitializing,
      signedOut,
      signIn: (token: string) => {
        // A sign-in is a session boundary too: nothing cached before this account existed in the
        // tab — public pages included — is carried into it. Mutations are left alone because the
        // login mutation calling this is still running.
        beginNewSessionEpoch()
        queryClient.removeQueries()
        setAccessToken(token)
        resumeRefresh()
        // Lifts the sign-out barrier, and tells other tabs their session has been replaced.
        sessionIdRef.current = newSessionId()
        writeSessionRecord({ id: sessionIdRef.current, status: 'active' })
        setSignedOut(false)
        setAccessTokenState(token)
      },
      signOut: async () => {
        // Persisted before anything else: the barrier for the next app start, and the signal that
        // ends this same sign-in in every other tab.
        writeSessionRecord({ id: sessionIdRef.current ?? newSessionId(), status: 'signed-out' })
        // Local state goes first and unconditionally, so the workspace is gone in the same render
        // the person asked to leave — not after a network round-trip that might fail.
        endSessionBySignOut()
        // Revokes the refresh token server-side and clears its HttpOnly cookie. It authenticates
        // by that cookie alone, so the access token being gone already does not matter. A failure
        // is tolerated: refresh stays suspended here, and the barrier above stops the next app
        // start from silently refreshing — and retries this request.
        await trackLogout(authApi.logout())
      },
    }),
    [accessToken, isInitializing, signedOut, queryClient, endSessionBySignOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
