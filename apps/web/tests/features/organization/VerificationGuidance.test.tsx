import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import { OrganizationSetupPage } from '../../../src/features/organization/pages/OrganizationSetupPage'
import { ProfilePage } from '../../../src/features/organization/pages/ProfilePage'
import i18n from '../../../src/lib/i18n'

/**
 * First-time guidance for organization verification. Every fact asserted here is the backend's:
 * the registration number is optional and private (CreateOrganizationRequest, PublicOrganizationResponse),
 * the evidence is one PDF up to 10MB that a new upload replaces (FileClassification /
 * OrganizationVerificationEvidenceService), and only publish/resume wait for verification
 * (organizationVerificationGating.ts).
 */

function organization(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    name: 'Hormuud Logistics',
    slug: 'hormuud',
    type: 'COMPANY',
    registrationNumber: null,
    website: null,
    description: null,
    hasCover: false,
    verificationStatus: 'DRAFT',
    verifiedAt: null,
    hasEvidence: false,
    evidenceUploadedAt: null,
    hasLogo: false,
    logoUploadedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(body = organization()) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const response = url.includes('/auth/refresh')
        ? new Response(JSON.stringify({ code: 'REFRESH_TOKEN_INVALID' }), { status: 401 })
        : url.endsWith('/organizations/org-1')
          ? new Response(JSON.stringify(body), { status: 200 })
          : new Response('[]', { status: 200 })
      return Promise.resolve(response)
    }),
  )
}

function renderWithOrganization(element: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: 'org-1', role: 'ORGANIZATION_ADMIN' }}>
          {element}
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('organization verification guidance', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('setup labels the registration number as optional and explains it, tied to the field', async () => {
    stubFetch()
    renderWithOrganization(<OrganizationSetupPage />)

    const field = screen.getByLabelText('Organization registration number (optional)')
    const hint = screen.getByText(/shown on your organization's registration document/i)
    expect(field).toHaveAttribute('aria-describedby', expect.stringContaining(hint.id))
    expect(hint).toHaveTextContent(/never shown on your public profile/i)
    // The next step after creating the organization is said up front.
    expect(screen.getByText(/FursadHub must first verify your organization/i)).toBeInTheDocument()
  })

  it('states the real upload rules, who can see the document, and what happens after submitting', async () => {
    stubFetch()
    renderWithOrganization(<ProfilePage />)

    expect(await screen.findByText(/PDF only, up to 10 MB/i)).toBeInTheDocument()
    expect(screen.getByText(/replaces the one on file/i)).toBeInTheDocument()
    expect(screen.getByText(/only your organization's staff and FursadHub's verification team/i)).toBeInTheDocument()
    expect(screen.getByText(/only publishing and resuming internships wait for verification/i)).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'What happens next' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/reviews your document/i),
        expect.stringMatching(/notification when your organization is verified/i),
      ]),
    )
    // Still explains why submission is unavailable without a document.
    expect(screen.getByRole('button', { name: 'Submit for verification' })).toBeDisabled()
  })

  it('promises no review turnaround anywhere in verification copy — FursadHub has no SLA to state', async () => {
    for (const language of ['en', 'so']) {
      await i18n.changeLanguage(language)
      for (const key of [
        'student:enrollment.pendingReviewBody',
        'organization:verificationGate.statusGuidance.SUBMITTED',
        'organization:verificationGate.statusGuidance.UNDER_REVIEW',
        'organization:profile.verificationNext.notify',
        'university:profile.verificationNext.notify',
      ]) {
        const copy = i18n.t(key)
        expect(copy, key).not.toBe(key)
        expect(copy, `${language} ${key}`).not.toMatch(/\d|\b(days?|hours?|weeks?|maalin\w*|saacad\w*|toddobaad\w*)\b/i)
      }
    }
    expect(i18n.t('student:enrollment.pendingReviewBody', { lng: 'en' })).toMatch(/notified/)
  })

  it('renders the same guidance in Somali', async () => {
    await i18n.changeLanguage('so')
    stubFetch()
    renderWithOrganization(<ProfilePage />)

    expect(await screen.findByText(/PDF oo keliya, ilaa 10 MB/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maxaa xiga' })).toBeInTheDocument()
    expect(screen.getByLabelText('Lambarka diiwaangelinta ururka (ikhtiyaari)')).toBeInTheDocument()
  })
})
