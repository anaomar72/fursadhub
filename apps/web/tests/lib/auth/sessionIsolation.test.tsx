import { useEffect } from 'react'
import { act, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AppShell } from '../../../src/app/layouts/AppShell'
import { LoginPage } from '../../../src/features/auth/pages/LoginPage'
import { AdminAreaLayout } from '../../../src/features/admin/components/AdminAreaLayout'
import { OrganizationAreaLayout } from '../../../src/features/organization/components/OrganizationAreaLayout'
import { UniversityAreaLayout } from '../../../src/features/university/components/UniversityAreaLayout'
import { RequireAuth } from '../../../src/lib/auth/RequireAuth'
import { resumeRefresh } from '../../../src/lib/auth/refreshCoordinator'
import { beginNewSessionEpoch, getAccessToken, setAccessToken } from '../../../src/lib/auth/tokenStore'
import i18n from '../../../src/lib/i18n'

// Each case is a full sign-in → sign-out → sign-in journey with several network round trips, so it
// gets the headroom the parallel full suite needs. The assertions themselves are unchanged.
configure({ asyncUtilTimeout: 5000 })
const JOURNEY_TIMEOUT_MS = 20_000

/**
 * Account-switch isolation: User A signs out, User B signs in on the same tab, and nothing of A may
 * render in between or after — identity, tenant, role chrome or cached data.
 *
 * <p>The real AppProviders, RequireAuth, LoginPage, AppShell (with its Topbar and sign-out menu) and
 * area layouts are mounted. The fake API answers by the bearer token on each request, exactly as the
 * backend does, so a response can only be "User A's" if it was cached under User A's session.
 *
 * <p>A MutationObserver records every text the document ever showed after A signed out. Asserting
 * on the final DOM alone would miss the defect this guards against: A's workspace flashing for a
 * frame while B's requests are still in flight.
 */

interface Identity {
  token: string
  email: string
  password: string
  me: { id: string; email: string }
  adminSession: { platformAdmin: boolean; roles: string[] }
  organizationMemberships: { organizationId: string; organizationName: string; role: string }[]
  organization?: { id: string; name: string; hasLogo: boolean }
  universityMembership?: { universityId: string; role: string; departmentIds: string[] }
  university?: { id: string; name: string; hasLogo: boolean }
}

const SUPER_ADMIN: Identity = {
  token: 'token-super-admin',
  email: 'root.admin@fursadhub.test',
  password: 'Password123',
  me: { id: 'user-admin', email: 'root.admin@fursadhub.test' },
  adminSession: { platformAdmin: true, roles: ['SUPER_ADMIN'] },
  organizationMemberships: [],
}

const STUDENT: Identity = {
  token: 'token-student',
  email: 'amina.student@fursadhub.test',
  password: 'Password123',
  me: { id: 'user-student', email: 'amina.student@fursadhub.test' },
  adminSession: { platformAdmin: false, roles: [] },
  organizationMemberships: [],
}

const ORG_A_ADMIN: Identity = {
  token: 'token-org-a',
  email: 'owner@hormuud-logistics.test',
  password: 'Password123',
  me: { id: 'user-org-a', email: 'owner@hormuud-logistics.test' },
  adminSession: { platformAdmin: false, roles: [] },
  organizationMemberships: [{ organizationId: 'org-a', organizationName: 'Hormuud Logistics', role: 'ORGANIZATION_ADMIN' }],
  organization: { id: 'org-a', name: 'Hormuud Logistics', hasLogo: false },
}

const ORG_B_RECRUITER: Identity = {
  token: 'token-org-b',
  email: 'recruiter@daryeel-health.test',
  password: 'Password123',
  me: { id: 'user-org-b', email: 'recruiter@daryeel-health.test' },
  adminSession: { platformAdmin: false, roles: [] },
  organizationMemberships: [{ organizationId: 'org-b', organizationName: 'Daryeel Health', role: 'RECRUITER' }],
  organization: { id: 'org-b', name: 'Daryeel Health', hasLogo: false },
}

const UNI_COORDINATOR: Identity = {
  token: 'token-uni',
  email: 'coordinator@jamhuriya.test',
  password: 'Password123',
  me: { id: 'user-uni', email: 'coordinator@jamhuriya.test' },
  adminSession: { platformAdmin: false, roles: [] },
  organizationMemberships: [],
  universityMembership: { universityId: 'uni-1', role: 'DEPARTMENT_COORDINATOR', departmentIds: ['dept-it'] },
  university: { id: 'uni-1', name: 'Jamhuriya University', hasLogo: false },
}

const IDENTITIES = [SUPER_ADMIN, STUDENT, ORG_A_ADMIN, ORG_B_RECRUITER, UNI_COORDINATOR]

function json(body: unknown, status = 200) {
  return new Response(body === null ? 'null' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function unauthorized() {
  return json({ code: 'UNAUTHORIZED', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }, 401)
}

/**
 * Latency control. While `held` is set, every authenticated read for that identity waits until
 * `release()` — the window in which a stale cache would otherwise be on screen.
 */
let held: Identity | null = null
let heldInFlight = 0
let releaseHeld: () => void = () => {}
let heldGate: Promise<void> = Promise.resolve()
function holdResponsesFor(identity: Identity) {
  held = identity
  heldGate = new Promise((resolve) => {
    releaseHeld = () => {
      held = null
      resolve()
    }
  })
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  const headers = new Headers(init?.headers)
  const bearer = headers.get('Authorization')?.replace('Bearer ', '') ?? null
  const caller = IDENTITIES.find((identity) => identity.token === bearer) ?? null

  if (url.includes('/auth/refresh')) return unauthorized()
  if (url.includes('/auth/logout')) return json({ message: 'Logged out.' })
  if (url.includes('/auth/login')) {
    const body = JSON.parse(String(init?.body)) as { email?: string; password: string }
    const identity = IDENTITIES.find((candidate) => candidate.email === body.email && candidate.password === body.password)
    return identity ? json({ accessToken: identity.token, tokenType: 'Bearer', expiresIn: 600 }) : unauthorized()
  }

  // resolveConsolePath() runs these three during sign-in itself, so they are never held.
  const isRoutingProbe = /\/(admin\/me|organization-memberships\/me|university-memberships\/me)$/.test(url)
  if (caller && held === caller && !isRoutingProbe) {
    heldInFlight += 1
    await heldGate
    heldInFlight -= 1
  }

  if (url.includes('/public/organizations/')) {
    const id = url.split('/public/organizations/')[1]
    const organization = IDENTITIES.find((identity) => identity.organization?.id === id)?.organization
    return organization ? json(organization) : json(null, 404)
  }
  if (url.includes('/public/universities/')) {
    const id = url.split('/public/universities/')[1]
    const university = IDENTITIES.find((identity) => identity.university?.id === id)?.university
    return university ? json(university) : json(null, 404)
  }
  if (!caller) return unauthorized()

  if (/\/api\/v1\/me$/.test(url)) return json({ ...caller.me, status: 'ACTIVE', preferredLocale: 'en', emailVerifiedAt: null, hasAvatar: false })
  if (url.endsWith('/admin/me')) return json(caller.adminSession)
  if (url.endsWith('/organization-memberships/me')) return json(caller.organizationMemberships)
  if (url.endsWith('/university-memberships/me')) return json(caller.universityMembership ?? null)
  if (url.includes('/me/legal-status')) return json({ acceptanceRequired: false, outstanding: [] })
  if (url.includes('/notifications/unread-count')) return json({ count: 0 })
  if (url.includes('/notifications')) return json({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 })
  return json({})
})

/** Everything the document has displayed since `start()`. */
function recordRenderedText() {
  let seen = ''
  const observer = new MutationObserver(() => {
    seen += `\n${document.body.textContent ?? ''}`
  })
  return {
    start() {
      seen = document.body.textContent ?? ''
      observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    },
    stop() {
      observer.disconnect()
      return seen + `\n${document.body.textContent ?? ''}`
    },
  }
}

let cacheSize = () => -1
function CacheProbe() {
  const queryClient = useQueryClient()
  useEffect(() => {
    cacheSize = () => queryClient.getQueryCache().getAll().length
  }, [queryClient])
  return null
}

/** Simulates the browser Back button / a typed URL: navigation that bypasses every link in the UI. */
let goTo: (path: string) => void = () => {}
function NavigationProbe() {
  const navigate = useNavigate()
  useEffect(() => {
    goTo = (path) => navigate(path)
  }, [navigate])
  return null
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AppProviders>
        <CacheProbe />
        <NavigationProbe />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Public home</p>} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminAreaLayout />
              </RequireAuth>
            }
          >
            <Route index element={<p>Admin console home</p>} />
          </Route>
          <Route
            path="/organization"
            element={
              <RequireAuth>
                <OrganizationAreaLayout />
              </RequireAuth>
            }
          >
            <Route index element={<p>Organization workspace home</p>} />
          </Route>
          <Route
            path="/university"
            element={
              <RequireAuth>
                <UniversityAreaLayout />
              </RequireAuth>
            }
          >
            <Route index element={<p>University workspace home</p>} />
          </Route>
          <Route
            path="/student"
            element={
              <RequireAuth>
                <AppShell workspace="student" areaLabel="Student" sections={[{ label: 'Student', items: [{ to: '/student', label: 'Student home' }] }]}>
                  <p>Student workspace home</p>
                </AppShell>
              </RequireAuth>
            }
          />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

async function signInAs(user: ReturnType<typeof userEvent.setup>, identity: Identity) {
  const identifier = await screen.findByLabelText(/email or username/i)
  await user.clear(identifier)
  await user.type(identifier, identity.email)
  await user.type(screen.getByLabelText(/^password$/i), identity.password)
  await user.click(screen.getByRole('button', { name: /^login$/i }))
}

/** Signs out through the real Topbar account menu, as a person would. */
async function signOutThroughMenu(user: ReturnType<typeof userEvent.setup>) {
  const banner = screen.getByRole('banner')
  await user.click(within(banner).getByRole('button', { name: /account/i }))
  await user.click(await screen.findByRole('menuitem', { name: /sign out/i }))
  await screen.findByRole('button', { name: /^login$/i })
}

beforeEach(async () => {
  // The token store and refresh coordinator are module state, shared by every case in this file:
  // start each one as a fresh page load would.
  beginNewSessionEpoch()
  setAccessToken(null)
  resumeRefresh()
  window.localStorage.clear()
  window.sessionStorage.clear()
  held = null
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  await i18n.changeLanguage('en')
})

afterEach(() => {
  releaseHeld()
  vi.unstubAllGlobals()
})

describe('session isolation across sign-out and sign-in', { timeout: JOURNEY_TIMEOUT_MS }, () => {
  it('Scenario A + D: organization A → sign out → organization B never shows A, even while B is still loading', async () => {
    const user = userEvent.setup()
    renderApp()

    await signInAs(user, ORG_A_ADMIN)
    expect(await screen.findByText('Organization workspace home')).toBeInTheDocument()
    expect((await screen.findAllByText('Hormuud Logistics')).length).toBeGreaterThan(0)
    expect(await screen.findByText(ORG_A_ADMIN.email)).toBeInTheDocument()

    await signOutThroughMenu(user)
    expect(getAccessToken()).toBeNull()
    expect(cacheSize()).toBe(0)

    const recorder = recordRenderedText()
    recorder.start()
    holdResponsesFor(ORG_B_RECRUITER)
    await signInAs(user, ORG_B_RECRUITER)

    // B's workspace reads are still in flight: nothing of A may be on screen.
    await waitFor(() => expect(getAccessToken()).toBe(ORG_B_RECRUITER.token))
    expect(screen.queryByText('Hormuud Logistics')).not.toBeInTheDocument()
    expect(screen.queryByText(ORG_A_ADMIN.email)).not.toBeInTheDocument()

    act(() => releaseHeld())
    expect((await screen.findAllByText('Daryeel Health')).length).toBeGreaterThan(0)
    expect(await screen.findByText(ORG_B_RECRUITER.email)).toBeInTheDocument()

    const everythingShown = recorder.stop()
    expect(everythingShown).not.toContain('Hormuud Logistics')
    expect(everythingShown).not.toContain(ORG_A_ADMIN.email)
  })

  it('Scenario B: Super Admin → sign out → student gets no admin chrome, identity or cached console', async () => {
    const user = userEvent.setup()
    renderApp()

    await signInAs(user, SUPER_ADMIN)
    expect(await screen.findByText('Admin console home')).toBeInTheDocument()
    expect(await screen.findByText(SUPER_ADMIN.email)).toBeInTheDocument()

    await signOutThroughMenu(user)
    expect(getAccessToken()).toBeNull()

    const recorder = recordRenderedText()
    recorder.start()
    await signInAs(user, STUDENT)
    expect(await screen.findByText('Student workspace home')).toBeInTheDocument()
    expect(await screen.findByText(STUDENT.email)).toBeInTheDocument()

    // The student types the old admin URL. The cached admin session must not open the console.
    holdResponsesFor(STUDENT)
    act(() => goTo('/admin'))
    expect(screen.queryByText('Admin console home')).not.toBeInTheDocument()
    act(() => releaseHeld())
    expect(await screen.findByText(/no administration access|do not have access/i)).toBeInTheDocument()

    const everythingShown = recorder.stop()
    expect(everythingShown).not.toContain(SUPER_ADMIN.email)
    expect(everythingShown).not.toContain('Admin console home')
  })

  it('Scenario C: Back to a protected route after sign-out lands on login, and the next account is not sent there', async () => {
    const user = userEvent.setup()
    renderApp()

    await signInAs(user, SUPER_ADMIN)
    expect(await screen.findByText('Admin console home')).toBeInTheDocument()
    await signOutThroughMenu(user)

    // Browser Back to the former admin route.
    act(() => goTo('/admin'))
    expect(await screen.findByRole('button', { name: /^login$/i })).toBeInTheDocument()
    expect(screen.queryByText('Admin console home')).not.toBeInTheDocument()

    // The next person to sign in on this tab is routed to THEIR console, not the previous
    // account's last protected page.
    await signInAs(user, STUDENT)
    expect(await screen.findByText('Student workspace home')).toBeInTheDocument()
    expect(screen.queryByText('Admin console home')).not.toBeInTheDocument()
  })

  it('same-role switch: student → sign out → another account starts from an empty cache', async () => {
    const otherStudent: Identity = {
      ...STUDENT,
      token: 'token-student-2',
      email: 'yusuf.student@fursadhub.test',
      me: { id: 'user-student-2', email: 'yusuf.student@fursadhub.test' },
    }
    IDENTITIES.push(otherStudent)
    try {
      const user = userEvent.setup()
      renderApp()

      await signInAs(user, STUDENT)
      expect(await screen.findByText(STUDENT.email)).toBeInTheDocument()
      await signOutThroughMenu(user)
      expect(cacheSize()).toBe(0)

      const recorder = recordRenderedText()
      recorder.start()
      await signInAs(user, otherStudent)
      expect(await screen.findByText(otherStudent.email)).toBeInTheDocument()
      expect(recorder.stop()).not.toContain(STUDENT.email)
    } finally {
      IDENTITIES.pop()
    }
  })

  it('Student → sign out → Super Admin: the admin gets their own console and nothing of the student', async () => {
    const user = userEvent.setup()
    renderApp()

    await signInAs(user, STUDENT)
    expect(await screen.findByText(STUDENT.email)).toBeInTheDocument()
    await signOutThroughMenu(user)

    const recorder = recordRenderedText()
    recorder.start()
    await signInAs(user, SUPER_ADMIN)
    expect(await screen.findByText('Admin console home')).toBeInTheDocument()
    expect(await screen.findByText(SUPER_ADMIN.email)).toBeInTheDocument()
    expect(recorder.stop()).not.toContain(STUDENT.email)
  })

  it('Organization → sign out → University: no organization branding, role or identity carries over', async () => {
    const user = userEvent.setup()
    renderApp()

    await signInAs(user, ORG_A_ADMIN)
    expect((await screen.findAllByText('Hormuud Logistics')).length).toBeGreaterThan(0)
    await signOutThroughMenu(user)

    const recorder = recordRenderedText()
    recorder.start()
    holdResponsesFor(UNI_COORDINATOR)
    await signInAs(user, UNI_COORDINATOR)
    await waitFor(() => expect(getAccessToken()).toBe(UNI_COORDINATOR.token))
    expect(screen.queryByText('Hormuud Logistics')).not.toBeInTheDocument()

    act(() => releaseHeld())
    expect(await screen.findByText('University workspace home')).toBeInTheDocument()
    expect((await screen.findAllByText('Jamhuriya University')).length).toBeGreaterThan(0)
    expect(await screen.findByText(UNI_COORDINATOR.email)).toBeInTheDocument()

    const everythingShown = recorder.stop()
    expect(everythingShown).not.toContain('Hormuud Logistics')
    expect(everythingShown).not.toContain(ORG_A_ADMIN.email)
  })

  it("A's requests still in flight when B signs in finish afterwards without reaching B's screen", async () => {
    const user = userEvent.setup()
    renderApp()

    // Alice's workspace reads are held open across her sign-out and Bashir's sign-in.
    holdResponsesFor(ORG_A_ADMIN)
    await signInAs(user, ORG_A_ADMIN)
    expect(await screen.findByText('Organization workspace home')).toBeInTheDocument()
    await signOutThroughMenu(user)

    const recorder = recordRenderedText()
    recorder.start()
    await signInAs(user, ORG_B_RECRUITER)
    expect((await screen.findAllByText('Daryeel Health')).length).toBeGreaterThan(0)

    // Now Alice's stale responses arrive.
    act(() => releaseHeld())
    await waitFor(() => expect(heldInFlight).toBe(0))

    expect(await screen.findByText(ORG_B_RECRUITER.email)).toBeInTheDocument()
    const everythingShown = recorder.stop()
    expect(everythingShown).not.toContain('Hormuud Logistics')
    expect(everythingShown).not.toContain(ORG_A_ADMIN.email)
  })

  it('Scenario E: sign-out keeps non-sensitive preferences (theme, language, remembered email)', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('fursadhub-theme', 'dark')
    renderApp()

    await user.click(await screen.findByLabelText(/remember me/i))
    await signInAs(user, STUDENT)
    expect(await screen.findByText(STUDENT.email)).toBeInTheDocument()
    await act(() => i18n.changeLanguage('so'))
    await act(() => i18n.changeLanguage('en'))

    await signOutThroughMenu(user)

    expect(window.localStorage.getItem('fursadhub-theme')).toBe('dark')
    expect(window.localStorage.getItem('i18nextLng')).toBe('en')
    expect(window.localStorage.getItem('fursadhub-remembered-email')).toBe(STUDENT.email)
  })
})
