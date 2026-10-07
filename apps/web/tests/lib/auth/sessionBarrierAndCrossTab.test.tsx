import { useEffect } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import * as authApi from '../../../src/features/auth/api/authApi'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { apiFetch } from '../../../src/lib/api/client'
import { refreshAccessToken, resumeRefresh } from '../../../src/lib/auth/refreshCoordinator'
import { SESSION_RECORD_KEY, readSessionRecord, type SessionRecord } from '../../../src/lib/auth/sessionRecord'
import { beginNewSessionEpoch, getAccessToken, setAccessToken } from '../../../src/lib/auth/tokenStore'

/**
 * The sign-out barrier (a failed logout must not let a reload resurrect the account) and cross-tab
 * session sync (a sign-out in one tab ends the same sign-in everywhere; stale events never end a
 * newer one).
 *
 * <p>The fake backend models the one thing the browser shares between tabs and reloads: the HttpOnly
 * refresh cookie. `cookie` is that cookie jar; `liveRefreshTokens` is the server's table. A "reload"
 * unmounts the app and resets the module state a real page load would reset, while localStorage
 * and the cookie survive — exactly as they do in a browser.
 */

interface Account {
  email: string
  password: string
  sub: string
}

const ALICE: Account = { email: 'alice.admin@fursadhub.test', password: 'Password123', sub: 'user-alice' }
const BASHIR: Account = { email: 'bashir.student@fursadhub.test', password: 'Password123', sub: 'user-bashir' }
const ACCOUNTS = [ALICE, BASHIR]

let cookie: string | null = null
let liveRefreshTokens = new Map<string, Account>()
let accessTokens = new Map<string, Account>()
let issued = 0
let logoutMode: 'ok' | 'network-error' = 'ok'
/** When set, the next refresh waits for this before answering. */
let refreshGate: Promise<void> | null = null
/** When set, the next /me waits for this before answering. */
let meGate: Promise<void> | null = null

function jwtFor(account: Account): string {
  issued += 1
  const payload = btoa(JSON.stringify({ sub: account.sub, jti: `jti-${issued}` }))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const token = `eyJhbGciOiJSUzI1NiJ9.${payload}.signature`
  accessTokens.set(token, account)
  return token
}

function issueSession(account: Account) {
  const refreshToken = `rt-${(issued += 1)}`
  liveRefreshTokens.set(refreshToken, account)
  cookie = refreshToken
  return { accessToken: jwtFor(account), tokenType: 'Bearer', expiresIn: 600 }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
const unauthorized = () =>
  json({ code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }, 401)

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (url.includes('/auth/login')) {
    const body = JSON.parse(String(init?.body)) as { email: string; password: string }
    const account = ACCOUNTS.find((candidate) => candidate.email === body.email && candidate.password === body.password)
    return account ? json(issueSession(account)) : unauthorized()
  }
  if (url.includes('/auth/refresh')) {
    const gate = refreshGate
    refreshGate = null
    const presented = cookie
    if (gate) await gate
    const account = presented ? liveRefreshTokens.get(presented) : undefined
    if (!presented || !account) return unauthorized()
    liveRefreshTokens.delete(presented) // rotation
    return json(issueSession(account))
  }
  if (url.includes('/auth/logout')) {
    if (logoutMode === 'network-error') throw new TypeError('Failed to fetch')
    if (cookie) liveRefreshTokens.delete(cookie)
    cookie = null
    return json({ message: 'Logged out.' })
  }
  const bearer = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '')
  const caller = bearer ? accessTokens.get(bearer) : undefined
  if (url.endsWith('/me')) {
    const gate = meGate
    meGate = null
    if (gate) await gate
    return caller ? json({ id: caller.sub, email: caller.email }) : unauthorized()
  }
  return json({})
})

let auth: ReturnType<typeof useAuth>
let queryClient: ReturnType<typeof useQueryClient>

function Probe() {
  const currentAuth = useAuth()
  const currentQueryClient = useQueryClient()
  useEffect(() => {
    auth = currentAuth
    queryClient = currentQueryClient
  })
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ email: string }>('/me'),
    enabled: currentAuth.isAuthenticated,
  })
  if (currentAuth.isInitializing) return <p>initializing</p>
  if (!currentAuth.isAuthenticated) return <p>signed out</p>
  return <p>signed in as {me.data?.email ?? '…'}</p>
}

let unmountApp: () => void = () => {}

/** First load, or a reload: module state starts fresh, localStorage and the cookie do not. */
async function loadApp() {
  unmountApp()
  beginNewSessionEpoch()
  setAccessToken(null)
  resumeRefresh()
  unmountApp = render(
    <AppProviders>
      <Probe />
    </AppProviders>,
  ).unmount
  await waitFor(() => expect(screen.queryByText('initializing')).not.toBeInTheDocument())
}

async function signInAs(account: Account) {
  const result = await authApi.login({ email: account.email, password: account.password })
  act(() => auth.signIn(result.accessToken))
  await screen.findByText(`signed in as ${account.email}`)
}

function calls(fragment: string) {
  return fetchMock.mock.calls.filter(([input]) => String(input).includes(fragment)).length
}

/** What another tab of this browser does to the shared record, as this tab observes it. */
function anotherTabWrites(record: SessionRecord) {
  const oldValue = window.localStorage.getItem(SESSION_RECORD_KEY)
  const newValue = JSON.stringify(record)
  window.localStorage.setItem(SESSION_RECORD_KEY, newValue)
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: SESSION_RECORD_KEY, oldValue, newValue, storageArea: window.localStorage }),
    )
  })
}

function deferred() {
  let resolve: () => void = () => {}
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  window.localStorage.clear()
  cookie = null
  liveRefreshTokens = new Map()
  accessTokens = new Map()
  logoutMode = 'ok'
  refreshGate = null
  meGate = null
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  unmountApp()
  unmountApp = () => {}
  vi.unstubAllGlobals()
})

describe('app start (bootstrap)', () => {
  it('a signed-in person who reloads gets their session back', async () => {
    await loadApp()
    await signInAs(ALICE)

    await loadApp()

    expect(await screen.findByText(`signed in as ${ALICE.email}`)).toBeInTheDocument()
  })

  it('after a successful sign-out, a reload stays signed out', async () => {
    await loadApp()
    await signInAs(ALICE)
    await act(() => auth.signOut())

    await loadApp()

    expect(screen.getByText('signed out')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('after a sign-out whose logout request FAILED, a reload does not resurrect the account from the surviving cookie', async () => {
    await loadApp()
    await signInAs(ALICE)
    logoutMode = 'network-error'

    await act(() => auth.signOut())
    // Local state is gone at once, but the server never heard: the cookie is still a live session.
    expect(getAccessToken()).toBeNull()
    expect(screen.getByText('signed out')).toBeInTheDocument()
    expect(liveRefreshTokens.has(cookie!)).toBe(true)

    const refreshesBeforeReload = calls('/auth/refresh')
    await loadApp()

    expect(screen.getByText('signed out')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(calls('/auth/refresh')).toBe(refreshesBeforeReload)
    // Still an explicit sign-out after the reload: the route guard keeps no return page for the
    // next account (found by the live Playwright run — a student was sent to the old /admin URL).
    expect(auth.signedOut).toBe(true)
    // Nothing resurrects it later either: a stray 401-driven refresh is refused too.
    expect(await refreshAccessToken()).toBeNull()
    expect(calls('/auth/refresh')).toBe(refreshesBeforeReload)
  })

  it('the barrier retries the server logout on the next start, revoking the surviving cookie', async () => {
    await loadApp()
    await signInAs(ALICE)
    logoutMode = 'network-error'
    await act(() => auth.signOut())
    const survivingCookie = cookie!

    logoutMode = 'ok' // the network is back
    await loadApp()

    await waitFor(() => expect(liveRefreshTokens.has(survivingCookie)).toBe(false))
    expect(screen.getByText('signed out')).toBeInTheDocument()
  })

  it('stays signed out across repeated reloads while the logout keeps failing', async () => {
    await loadApp()
    await signInAs(ALICE)
    logoutMode = 'network-error'
    await act(() => auth.signOut())

    await loadApp()
    await loadApp()

    expect(screen.getByText('signed out')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('after a failed sign-out, another account can sign in and is the one a reload restores', async () => {
    await loadApp()
    await signInAs(ALICE)
    logoutMode = 'network-error'
    await act(() => auth.signOut())
    await loadApp()

    logoutMode = 'ok'
    await signInAs(BASHIR)
    expect(readSessionRecord()?.status).toBe('active')

    await loadApp()
    expect(await screen.findByText(`signed in as ${BASHIR.email}`)).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(ALICE.email))).not.toBeInTheDocument()
  })

  it('A signs out, B signs in, reload: only B comes back', async () => {
    await loadApp()
    await signInAs(ALICE)
    await act(() => auth.signOut())
    await signInAs(BASHIR)

    await loadApp()

    expect(await screen.findByText(`signed in as ${BASHIR.email}`)).toBeInTheDocument()
  })

  it('an expired access token with a live refresh session still refreshes normally', async () => {
    await loadApp()
    await signInAs(ALICE)

    // The access token expires: the API answers 401 and the client refreshes from the cookie.
    accessTokens.delete(getAccessToken()!)
    const refreshed = await act(() => refreshAccessToken())

    expect(refreshed).not.toBeNull()
    expect(auth.isAuthenticated).toBe(true)
  })

  it('a sign-in waits for a logout still in flight, so the logout cannot clear the new cookie', async () => {
    await loadApp()
    await signInAs(ALICE)
    const logoutHeld = deferred()
    fetchMock.mockImplementationOnce(async (input) => {
      expect(String(input)).toContain('/auth/logout')
      await logoutHeld.promise
      if (cookie) liveRefreshTokens.delete(cookie)
      cookie = null
      return json({ message: 'Logged out.' })
    })

    const signingOut = act(() => auth.signOut())
    const login = authApi.login({ email: BASHIR.email, password: BASHIR.password })
    await Promise.resolve()
    expect(calls('/auth/login')).toBe(1) // only Alice's original sign-in so far

    logoutHeld.resolve()
    await signingOut
    const result = await login
    expect(calls('/auth/login')).toBe(2)
    // Bashir's cookie was set after the logout cleared Alice's, so it survives.
    expect(cookie && liveRefreshTokens.get(cookie)).toBe(BASHIR)
    expect(result.accessToken).toBeTruthy()
  })
})

describe('cross-tab sign-out', () => {
  it('a sign-out in another tab ends this tab: token, cache and refresh', async () => {
    await loadApp()
    await signInAs(ALICE)
    const record = readSessionRecord()!

    anotherTabWrites({ id: record.id, status: 'signed-out' })

    expect(await screen.findByText('signed out')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(auth.signedOut).toBe(true)
    expect(queryClient.getQueryCache().getAll().every((query) => query.state.data === undefined)).toBe(true)
    const refreshes = calls('/auth/refresh')
    expect(await refreshAccessToken()).toBeNull()
    expect(calls('/auth/refresh')).toBe(refreshes)
  })

  it('a refresh in flight when another tab signs out cannot bring the session back', async () => {
    await loadApp()
    await signInAs(ALICE)
    const gate = deferred()
    refreshGate = gate.promise
    const inFlight = refreshAccessToken()

    anotherTabWrites({ id: readSessionRecord()!.id, status: 'signed-out' })
    gate.resolve()

    expect(await inFlight).toBeNull()
    expect(getAccessToken()).toBeNull()
    expect(screen.getByText('signed out')).toBeInTheDocument()
  })

  it('a refresh that answers before the other tab’s event arrives still honours its sign-out', async () => {
    await loadApp()
    await signInAs(ALICE)
    const gate = deferred()
    refreshGate = gate.promise
    const inFlight = refreshAccessToken()

    // The other tab has written its sign-out, but the storage event has not been delivered yet.
    window.localStorage.setItem(SESSION_RECORD_KEY, JSON.stringify({ id: readSessionRecord()!.id, status: 'signed-out' }))
    gate.resolve()

    expect(await act(() => inFlight)).toBeNull()
    expect(getAccessToken()).toBeNull()
    // And the barrier it wrote is left in place for the next start.
    expect(readSessionRecord()?.status).toBe('signed-out')
  })

  it('an API response in flight when another tab signs out never lands in this tab', async () => {
    await loadApp()
    await signInAs(ALICE)
    const gate = deferred()
    meGate = gate.promise
    act(() => {
      void queryClient.refetchQueries({ queryKey: ['me'] })
    })

    anotherTabWrites({ id: readSessionRecord()!.id, status: 'signed-out' })
    gate.resolve()

    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument())
    expect(queryClient.getQueryData(['me'])).toBeUndefined()
  })

  it('a stale sign-out for an earlier sign-in does not end the account signed in since', async () => {
    await loadApp()
    await signInAs(ALICE)
    const aliceSession = readSessionRecord()!.id
    await act(() => auth.signOut())
    await signInAs(BASHIR)

    // Alice's sign-out reaches this tab late.
    anotherTabWrites({ id: aliceSession, status: 'signed-out' })

    expect(screen.getByText(`signed in as ${BASHIR.email}`)).toBeInTheDocument()
    expect(getAccessToken()).not.toBeNull()
  })

  it('a sign-in to another account in another tab replaces this tab without ever showing the old account', async () => {
    await loadApp()
    await signInAs(ALICE)

    // Bashir signs in from another tab: the shared cookie is now his.
    issueSession(BASHIR)
    const seen: string[] = []
    const observer = new MutationObserver(() => seen.push(document.body.textContent ?? ''))
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    anotherTabWrites({ id: 'another-tabs-sign-in', status: 'active' })

    expect(await screen.findByText(`signed in as ${BASHIR.email}`)).toBeInTheDocument()
    observer.disconnect()
    expect(seen.join('\n')).not.toContain(ALICE.email)
    expect(readSessionRecord()?.id).toBe('another-tabs-sign-in')
  })

  it('a tab that is already signed out ignores sign-outs it has nothing to do with', async () => {
    await loadApp()
    anotherTabWrites({ id: 'someone-elses-session', status: 'signed-out' })
    expect(screen.getByText('signed out')).toBeInTheDocument()
  })
})
