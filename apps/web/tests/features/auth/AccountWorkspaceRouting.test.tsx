import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { LoginPage } from '../../../src/features/auth/pages/LoginPage'
import { GetStartedPage } from '../../../src/features/auth/pages/GetStartedPage'
import { resolveAccountWorkspace } from '../../../src/features/auth/roleRedirect'
import { useAccountContext } from '../../../src/features/auth/useAccountContext'
import i18n from '../../../src/lib/i18n'

/**
 * Registration stores only an email and a password, so an account with no organization/university
 * membership, no platform role and no student enrollment or profile has NO recorded intent. Generic
 * sign-in must ask (the get-started step), not silently drop it into the student area — that misled
 * organization and university founders who signed in before creating their institution.
 */

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(body === null ? 'null' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function notFound(code: string) {
  return jsonResponse({ code, message: '', status: 404, path: '', timestamp: '', fieldErrors: [] }, 404)
}

interface Account {
  platformAdmin?: boolean
  organizationMemberships?: unknown[]
  universityMembership?: unknown
  enrollment?: 'yes' | 'no' | 'error'
  profile?: 'yes' | 'no'
}

let requested: string[] = []

function stubAccount(account: Account) {
  requested = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      requested.push(url)
      if (url.includes('/auth/refresh')) {
        return jsonResponse({ code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }, 401)
      }
      if (url.includes('/auth/login')) return jsonResponse({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 600 })
      if (url.includes('/admin/me')) return jsonResponse({ platformAdmin: !!account.platformAdmin, roles: account.platformAdmin ? ['SUPER_ADMIN'] : [] })
      if (url.includes('/organization-memberships/me')) return jsonResponse(account.organizationMemberships ?? [])
      if (url.includes('/university-memberships/me')) {
        return account.universityMembership ? jsonResponse(account.universityMembership) : notFound('UNIVERSITY_MEMBERSHIP_NOT_FOUND')
      }
      if (url.includes('/students/me/enrollment')) {
        if (account.enrollment === 'yes') return jsonResponse({ id: 'e-1', verificationStatus: 'DRAFT' })
        if (account.enrollment === 'error') return jsonResponse({ code: 'INTERNAL_ERROR', message: '', status: 500, path: '', timestamp: '', fieldErrors: [] }, 500)
        return notFound('STUDENT_ENROLLMENT_NOT_FOUND')
      }
      if (url.includes('/students/me/profile')) {
        return account.profile === 'yes' ? jsonResponse({ userId: 'u-1', fullName: 'Amina' }) : notFound('STUDENT_PROFILE_NOT_FOUND')
      }
      if (url.includes('/auth/me') || url.endsWith('/me')) return jsonResponse({ id: 'u-1', email: 'person@example.test', status: 'ACTIVE' })
      if (url.includes('/legal')) return jsonResponse([])
      return jsonResponse({})
    }),
  )
}

const ORGANIZATION_MEMBERSHIP = { membershipId: 'm-1', organizationId: 'org-1', role: 'ORGANIZATION_ADMIN', status: 'ACTIVE' }
const UNIVERSITY_MEMBERSHIP = { membershipId: 'm-2', universityId: 'uni-1', role: 'DEPARTMENT_COORDINATOR', status: 'ACTIVE' }

describe('resolveAccountWorkspace', () => {
  it.each([
    ['a platform admin', { platformAdmin: true }, 'platform'],
    ['an organization founder or staff member', { organizationMemberships: [ORGANIZATION_MEMBERSHIP] }, 'organization'],
    ['university staff', { universityMembership: UNIVERSITY_MEMBERSHIP }, 'university'],
    ['a student with a claimed enrollment', { enrollment: 'yes' }, 'student'],
    ['a student with a saved profile but no enrollment yet', { profile: 'yes' }, 'student'],
    ['a verified account with no workspace at all', {}, 'none'],
  ] as const)('%s → %s', async (_label, account, kind) => {
    stubAccount(account as Account)
    expect((await resolveAccountWorkspace()).kind).toBe(kind)
  })

  it('never probes student records for an account that already has a staff workspace', async () => {
    stubAccount({ organizationMemberships: [ORGANIZATION_MEMBERSHIP] })
    await resolveAccountWorkspace()
    expect(requested.some((url) => url.includes('/students/me/'))).toBe(false)
  })

  it('treats only a 404 as "no student record" — a server failure keeps the student default', async () => {
    stubAccount({ enrollment: 'error' })
    expect((await resolveAccountWorkspace()).kind).toBe('student')
  })
})

function renderLogin(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/get-started" element={<div>Get started step</div>} />
          <Route path="/student" element={<div>Student console</div>} />
          <Route path="/organization" element={<div>Organization console</div>} />
          <Route path="/university" element={<div>University console</div>} />
          <Route path="/admin" element={<div>Admin console</div>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email or username/i), 'person@example.test')
  await user.type(screen.getByLabelText(/^password$/i), 'Password123')
  await user.click(screen.getByRole('button', { name: /^login$/i }))
}

describe('generic sign-in destination', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it.each([
    ['a founder who signed out before creating anything goes to the neutral step, not Student', {}, 'Get started step'],
    ['an established student still lands in Student', { enrollment: 'yes' }, 'Student console'],
    ['organization staff still land in Organization', { organizationMemberships: [ORGANIZATION_MEMBERSHIP] }, 'Organization console'],
    ['university staff still land in University', { universityMembership: UNIVERSITY_MEMBERSHIP }, 'University console'],
    ['a platform admin still lands in Admin', { platformAdmin: true }, 'Admin console'],
  ] as const)('%s', async (_label, account, destination) => {
    stubAccount(account as Account)
    const user = userEvent.setup()
    renderLogin()
    await signIn(user)
    expect(await screen.findByText(destination)).toBeInTheDocument()
  })

  it.each([
    ['student', 'Student console'],
    ['organization', 'Organization console'],
    ['university', 'University console'],
  ])('the %s door from registration still opens that setup directly', async (role, destination) => {
    stubAccount({})
    const user = userEvent.setup()
    renderLogin(`/login?role=${role}`)
    await signIn(user)
    expect(await screen.findByText(destination)).toBeInTheDocument()
  })
})

function renderGetStarted() {
  return render(
    <MemoryRouter initialEntries={['/get-started']}>
      <AppProviders>
        <Routes>
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route path="/organization" element={<div>Organization console</div>} />
          <Route path="/student" element={<div>Student console</div>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('GetStartedPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('offers exactly the three self-service setups, each opening its existing setup step', async () => {
    stubAccount({})
    renderGetStarted()

    expect(await screen.findByRole('heading', { name: 'Choose how you want to use FursadHub' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Student/ })).toHaveAttribute('href', '/student/enrollment')
    expect(screen.getByRole('link', { name: /^Organization/ })).toHaveAttribute('href', '/organization')
    expect(screen.getByRole('link', { name: /^University/ })).toHaveAttribute('href', '/university')
    expect(screen.queryByText(/super.?admin|recruiter|coordinator/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('sends an account that already has a workspace straight to it, never through onboarding again', async () => {
    stubAccount({ organizationMemberships: [ORGANIZATION_MEMBERSHIP] })
    renderGetStarted()
    expect(await screen.findByText('Organization console')).toBeInTheDocument()
  })

  it('is translated', async () => {
    stubAccount({})
    await i18n.changeLanguage('so')
    renderGetStarted()
    expect(await screen.findByRole('heading', { name: 'Dooro sida aad u rabto inaad u isticmaasho FursadHub' })).toBeInTheDocument()
  })
})

describe('account menu destination', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
  }

  it('points a no-workspace account at the get-started step and gives it no role label', async () => {
    stubAccount({})
    const { result } = renderHook(() => useAccountContext(true), { wrapper })
    await waitFor(() => expect(result.current?.consolePath).toBe('/get-started'))
    expect(result.current?.roleLabel).toBeUndefined()
  })

  it('still labels an established student as Student', async () => {
    stubAccount({ enrollment: 'yes' })
    await i18n.changeLanguage('en')
    const { result } = renderHook(() => useAccountContext(true), { wrapper })
    await waitFor(() => expect(result.current?.roleLabel).toBe('Student'))
    expect(result.current?.consolePath).toBe('/student')
  })
})
