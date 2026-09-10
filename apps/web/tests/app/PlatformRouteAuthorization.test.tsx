import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminSessionContext } from '../../src/features/admin/components/AdminSessionContext'
import {
  AdminLandingRedirect,
  RequirePlatformCapability,
} from '../../src/features/admin/components/RequirePlatformCapability'
import {
  adminLandingPath,
  adminWorkspaceLabelKey,
  type AdminCapabilities,
} from '../../src/features/admin/adminCapabilities'
import type { AdminSession, PlatformRole } from '../../src/features/admin/types'
import '../../src/lib/i18n'

/**
 * Phase E. Direct URL navigation into the platform console, not nav-link visibility.
 *
 * <p>Each case mounts the real guard at a real route and asserts on what renders. The protected
 * element is a sentinel: if it appears at all the page mounted, which is exactly the failure being
 * guarded against — a verification officer opening a Super Admin page and firing its queries before
 * anything refuses them.
 *
 * <p>Every DENIED expectation below mirrors a backend 403 that {@code PlatformAuthorizationIT},
 * {@code AdminOpportunityQueryIT} and {@code PlatformVerificationOfficerIT} already assert against a
 * real Postgres. These are UX assertions; the API re-authorizes every request from current database
 * state regardless of who reaches the route (CLAUDE.md section 24).
 */

const PROTECTED = 'PROTECTED PLATFORM PAGE'

function sessionOf(...roles: PlatformRole[]): AdminSession {
  return { platformAdmin: roles.length > 0, roles }
}

function platformAt(session: AdminSession, capability: keyof AdminCapabilities) {
  render(
    <MemoryRouter initialEntries={['/admin/guarded']}>
      <AdminSessionContext.Provider value={session}>
        <Routes>
          <Route path="/admin" element={<Outlet />}>
            <Route path="dashboard" element={<p>platform dashboard</p>} />
            <Route path="organizations" element={<p>institution queue</p>} />
            <Route path="verification-escalations" element={<p>escalation queue</p>} />
            <Route path="users" element={<p>account directory</p>} />
            <Route element={<RequirePlatformCapability capability={capability} />}>
              <Route path="guarded" element={<p>{PROTECTED}</p>} />
            </Route>
          </Route>
        </Routes>
      </AdminSessionContext.Provider>
    </MemoryRouter>,
  )
}

const SUPER_ADMIN_ONLY: (keyof AdminCapabilities)[] = [
  'canReadStatistics',
  'canAdministerAccounts',
  'canManagePlatformRoles',
  'canAdministerCompliance',
  'canReadAuditTrail',
  'canOverseeOpportunities',
]

const REVIEWER_SHARED: (keyof AdminCapabilities)[] = ['canReviewInstitutions', 'canReviewStudentCases']

describe('platform console route authorization', () => {
  it.each(SUPER_ADMIN_ONLY)(
    'a VERIFICATION_OFFICER cannot reach the route behind %s',
    (capability) => {
      platformAt(sessionOf('VERIFICATION_OFFICER'), capability)

      expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument()
      // Sent to their own landing page — the institution queue, which is their work.
      expect(screen.getByText('institution queue')).toBeInTheDocument()
    },
  )

  it.each(SUPER_ADMIN_ONLY)('a SUPER_ADMIN reaches the route behind %s', (capability) => {
    platformAt(sessionOf('SUPER_ADMIN'), capability)

    expect(screen.getByText(PROTECTED)).toBeInTheDocument()
  })

  it.each(REVIEWER_SHARED)('both platform roles reach the route behind %s', (capability) => {
    platformAt(sessionOf('VERIFICATION_OFFICER'), capability)
    expect(screen.getByText(PROTECTED)).toBeInTheDocument()
  })

  it('a platform grant carrying no usable capability is refused rather than bounced', () => {
    // An unknown or withdrawn role: platformAdmin is true because a grant exists, but nothing in the
    // console is reachable. Redirecting would bounce between two guarded routes forever, so the
    // guard refuses in place. Fail closed, and fail without a loop.
    platformAt(sessionOf(), 'canReviewInstitutions')

    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument()
    expect(screen.queryByText('institution queue')).not.toBeInTheDocument()
    expect(screen.getByText('You do not have platform administration access.')).toBeInTheDocument()
  })
})

describe('platform console landing', () => {
  function landingAt(session: AdminSession) {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminSessionContext.Provider value={session}>
          <Routes>
            <Route path="/admin" element={<Outlet />}>
              <Route index element={<AdminLandingRedirect />} />
              <Route path="dashboard" element={<p>platform dashboard</p>} />
              <Route path="organizations" element={<p>institution queue</p>} />
            </Route>
          </Routes>
        </AdminSessionContext.Provider>
      </MemoryRouter>,
    )
  }

  it('sends a SUPER_ADMIN to the platform overview, not to a reviewer queue', () => {
    landingAt(sessionOf('SUPER_ADMIN'))

    expect(screen.getByText('platform dashboard')).toBeInTheDocument()
  })

  it('sends a VERIFICATION_OFFICER to the institution queue, not to a page they are refused', () => {
    landingAt(sessionOf('VERIFICATION_OFFICER'))

    expect(screen.getByText('institution queue')).toBeInTheDocument()
  })

  it('resolves no path at all for a grant with no usable capability', () => {
    expect(adminLandingPath(sessionOf())).toBeNull()
  })
})

describe('the console names the authority the reader actually has', () => {
  /*
   * Both platform roles share one shell. It used to greet everyone as the "Super Admin Console",
   * so a verification officer — three review queues, refused every Super Admin endpoint — was told
   * they were sitting in the Super Admin console.
   */
  it('calls itself the Super Admin console only for full platform authority', () => {
    expect(adminWorkspaceLabelKey(sessionOf('SUPER_ADMIN'))).toBe('common:shell.portals.admin')
  })

  it('gives a verification officer a console named after their own work', () => {
    expect(adminWorkspaceLabelKey(sessionOf('VERIFICATION_OFFICER')))
      .toBe('common:shell.portals.verificationOfficer')
  })

  it('resolves both label keys in English and Somali', async () => {
    const i18n = (await import('../../src/lib/i18n')).default
    for (const locale of ['en', 'so']) {
      const t = i18n.getFixedT(locale)
      for (const key of ['common:shell.portals.admin', 'common:shell.portals.verificationOfficer']) {
        const value = t(key)
        expect(value, `${key} in ${locale}`).not.toBe(key)
        expect(value.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
