import { useEffect } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { apiFetch } from '../../../src/lib/api/client'
import { refreshAccessToken } from '../../../src/lib/auth/refreshCoordinator'
import { getAccessToken } from '../../../src/lib/auth/tokenStore'

/**
 * The races behind account switching, one at a time: a silent refresh that resolves after sign-out,
 * a 401 that lands while the logout request is out, a logout request that fails, and a session that
 * expires underneath a signed-in tab.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const invalidRefresh = () =>
  json({ code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }, 401)

let auth: ReturnType<typeof useAuth>
let queryClient: ReturnType<typeof useQueryClient>
function Probe() {
  const currentAuth = useAuth()
  const currentQueryClient = useQueryClient()
  useEffect(() => {
    auth = currentAuth
    queryClient = currentQueryClient
  })
  return null
}

function CachedIdentity() {
  const { isAuthenticated } = useAuth()
  const me = useQuery({ queryKey: ['me'], queryFn: () => apiFetch<{ email: string }>('/me'), enabled: isAuthenticated })
  return <p>{me.data?.email ?? 'nobody'}</p>
}

async function mount() {
  render(
    <AppProviders>
      <Probe />
      <CachedIdentity />
    </AppProviders>,
  )
  await waitFor(() => expect(auth.isInitializing).toBe(false))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('session lifecycle', () => {
  it('a refresh still in flight at sign-out cannot bring the old token back', async () => {
    let answerRefresh: (response: Response) => void = () => {}
    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) {
          refreshCalls += 1
          // The app-start refresh fails; the second one is held open across the sign-out.
          if (refreshCalls === 1) return Promise.resolve(invalidRefresh())
          return new Promise<Response>((resolve) => {
            answerRefresh = resolve
          })
        }
        if (url.includes('/auth/logout')) return Promise.resolve(json({ message: 'Logged out.' }))
        return Promise.resolve(json({ email: 'a@example.com' }))
      }),
    )
    await mount()
    act(() => auth.signIn('token-a'))

    const lateRefresh = refreshAccessToken()
    await act(() => auth.signOut())
    answerRefresh(json({ accessToken: 'token-a-rotated', tokenType: 'Bearer', expiresIn: 600 }))

    expect(await lateRefresh).toBeNull()
    expect(getAccessToken()).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('after sign-out, a 401 does not silently refresh into the account that left', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/refresh')) return Promise.resolve(invalidRefresh())
      if (url.includes('/auth/logout')) return Promise.resolve(json({ message: 'Logged out.' }))
      return Promise.resolve(json({ code: 'UNAUTHORIZED', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)
    await mount()
    act(() => auth.signIn('token-a'))
    await act(() => auth.signOut())
    fetchMock.mockClear()

    await expect(apiFetch('/student/profile')).rejects.toBeTruthy()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/auth/refresh'))).toBe(false)

    // The next sign-in restores normal refresh behaviour.
    act(() => auth.signIn('token-b'))
    await refreshAccessToken()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/auth/refresh'))).toBe(true)
  })

  it('a failed logout request still ends the session locally, and sign-out does not throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) return Promise.resolve(invalidRefresh())
        if (url.includes('/auth/logout')) return Promise.reject(new TypeError('Failed to fetch'))
        return Promise.resolve(json({ email: 'a@example.com' }))
      }),
    )
    await mount()
    act(() => auth.signIn('token-a'))
    await waitFor(() => expect(queryClient.getQueryData(['me'])).toEqual({ email: 'a@example.com' }))

    await act(() => expect(auth.signOut()).resolves.toBeUndefined())

    expect(getAccessToken()).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.signedOut).toBe(true)
    // A still-mounted observer may re-create its (empty) entry; none may hold the old data.
    expect(queryClient.getQueryCache().getAll().every((query) => query.state.data === undefined)).toBe(true)
  })

  it('a session that expires underneath the tab takes its cached data with it', async () => {
    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) {
          refreshCalls += 1
          return Promise.resolve(invalidRefresh())
        }
        return Promise.resolve(json({ email: 'a@example.com' }))
      }),
    )
    await mount()
    act(() => auth.signIn('token-a'))
    await waitFor(() => expect(queryClient.getQueryData(['me'])).toEqual({ email: 'a@example.com' }))

    refreshCalls = 0

    await act(() => refreshAccessToken())

    expect(refreshCalls).toBe(1)
    expect(auth.isAuthenticated).toBe(false)
    // Not an explicit sign-out: the guard may still offer a return to the page after re-login.
    expect(auth.signedOut).toBe(false)
    expect(queryClient.getQueryData(['me'])).toBeUndefined()
  })

  it('signing in starts from an empty cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(String(input).includes('/auth/refresh') ? invalidRefresh() : json({ email: 'b@example.com' })),
      ),
    )
    await mount()
    act(() => queryClient.setQueryData(['admin', 'session'], { platformAdmin: true, roles: ['SUPER_ADMIN'] }))

    act(() => auth.signIn('token-b'))

    expect(queryClient.getQueryData(['admin', 'session'])).toBeUndefined()
  })
})
