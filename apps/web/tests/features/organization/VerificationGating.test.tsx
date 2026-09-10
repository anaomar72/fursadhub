import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { OpportunityDetailPage } from '../../../src/features/opportunities/pages/OpportunityDetailPage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import {
  VERIFICATION_GATED_ACTIONS,
  canSubmitForVerification,
  isOrganizationVerified,
} from '../../../src/features/organization/organizationVerificationGating'
import i18n from '../../../src/lib/i18n'
import type { InstitutionVerificationStatus } from '../../../src/features/organization/types'

const ORGANIZATION_ID = 'org-1'
const OPPORTUNITY_ID = 'opp-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function opportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: OPPORTUNITY_ID,
    organizationId: ORGANIZATION_ID,
    title: 'Frontend Intern',
    description: 'Build interfaces.',
    responsibilities: null,
    requirements: null,
    mode: 'PUBLIC',
    numberOfOpenings: 1,
    workMode: 'ONSITE',
    location: null,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    applicationDeadline: '2026-09-20',
    skills: [],
    perks: [],
    status: 'DRAFT',
    publishedAt: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

let publishAttempts = 0

function stubApi({
  status = 'VERIFIED' as InstitutionVerificationStatus,
  opportunityStatus = 'DRAFT',
  publishRejects = false,
} = {}) {
  publishAttempts = 0
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/publish') || url.includes('/resume')) {
        publishAttempts += 1
        if (publishRejects) {
          return jsonResponse(
            {
              code: 'ORGANIZATION_NOT_VERIFIED',
              message: 'Your organization must be verified before publishing opportunities.',
              status: 409,
              path: url,
              timestamp: '',
              fieldErrors: [],
            },
            409,
          )
        }
        return jsonResponse(opportunity({ status: 'PUBLISHED' }))
      }
      if (url.includes(`/organizations/${ORGANIZATION_ID}`) && !url.includes('/opportunities')) {
        return jsonResponse({
          id: ORGANIZATION_ID,
          name: 'TechSolutions',
          slug: 'tech',
          type: 'COMPANY',
          registrationNumber: null,
          website: null,
          description: null,
          hasCover: false,
          verificationStatus: status,
          verifiedAt: status === 'VERIFIED' ? '2026-01-01T00:00:00Z' : null,
          hasEvidence: true,
          evidenceUploadedAt: '2026-01-01T00:00:00Z',
          hasLogo: false,
          logoUploadedAt: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        })
      }
      // List endpoints must answer with arrays — the draft page also renders the screening-question
      // editor and the targeting section.
      if (url.includes('/screening-questions')) return jsonResponse([])
      if (url.includes('/targets')) return jsonResponse([])
      if (url.includes('/universities')) return jsonResponse([])
      if (url.includes('/opportunities/')) return jsonResponse(opportunity({ status: opportunityStatus }))
      return jsonResponse({})
    }),
  )
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/organization/opportunities/${OPPORTUNITY_ID}`]}>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: ORGANIZATION_ID, role: 'ORGANIZATION_ADMIN' }}>
          <Routes>
            <Route path="/organization/opportunities/:opportunityId" element={<OpportunityDetailPage />} />
          </Routes>
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('Organization verification gating (Backend Phase B1.5)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  describe('the gated surface', () => {
    /**
     * Derived from the call sites of `OrganizationVerificationGuard`, not guessed: on the
     * organization's own side `requireVerifiedForOwnAction` is called from
     * `OpportunityStateTransitionService.publish` and `.resume`, and nowhere else. Everything the
     * guard's other entry point covers — applying, nominating, consenting — is performed by a
     * student or a university, so there is nothing in this portal to gate for it.
     */
    it('names exactly publish and resume', () => {
      expect([...VERIFICATION_GATED_ACTIONS]).toEqual(['publish', 'resume'])
    })

    it('treats only VERIFIED as verified', () => {
      const statuses: InstitutionVerificationStatus[] = [
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'NEEDS_CHANGES',
        'REJECTED',
        'SUSPENDED',
        'REVOKED',
      ]
      expect(isOrganizationVerified('VERIFIED')).toBe(true)
      expect(statuses.every((value) => !isOrganizationVerified(value))).toBe(true)
    })

    it('offers re-submission only from the two statuses the server accepts it from', () => {
      expect(canSubmitForVerification('DRAFT')).toBe(true)
      expect(canSubmitForVerification('NEEDS_CHANGES')).toBe(true)
      expect(canSubmitForVerification('SUBMITTED')).toBe(false)
      expect(canSubmitForVerification('UNDER_REVIEW')).toBe(false)
      expect(canSubmitForVerification('REJECTED')).toBe(false)
    })
  })

  describe('a verified organization', () => {
    it('can publish, with no gate notice in the way', async () => {
      stubApi({ status: 'VERIFIED' })
      renderPage()

      const publish = await screen.findByRole('button', { name: 'Publish' })
      expect(publish).toBeEnabled()
      expect(screen.queryByText('Verification required to publish')).not.toBeInTheDocument()

      await userEvent.click(publish)
      await waitFor(() => expect(publishAttempts).toBe(1))
    })
  })

  describe('an unverified organization', () => {
    it('disables publish and explains why, in the backend’s own words for the status', async () => {
      stubApi({ status: 'DRAFT' })
      renderPage()

      expect(await screen.findByText('Verification required to publish')).toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled())
    })

    it('disables resume for a paused internship', async () => {
      stubApi({ status: 'SUSPENDED', opportunityStatus: 'PAUSED' })
      renderPage()

      await waitFor(() => expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled())
    })

    it('points a DRAFT organization at the profile, where it can actually submit', async () => {
      stubApi({ status: 'DRAFT' })
      renderPage()

      const link = await screen.findByRole('link', { name: 'Go to organization profile' })
      expect(link).toHaveAttribute('href', '/organization/profile')
    })

    /**
     * Section 25: use the exact backend states. No invented review duration, no completion
     * percentage, no "approved soon" — FursadHub has no such data and would be making a promise.
     */
    it('states the real status and promises nothing about timing', async () => {
      stubApi({ status: 'UNDER_REVIEW' })
      renderPage()

      const notice = await screen.findByText(/Under review/)
      expect(notice).toBeInTheDocument()
      const body = document.body.textContent ?? ''
      expect(body).not.toMatch(/approved soon/i)
      expect(body).not.toMatch(/24 hours/i)
      expect(body).not.toMatch(/\d+% complete/i)
    })

    it('offers no submit shortcut from a status the server would refuse it from', async () => {
      stubApi({ status: 'UNDER_REVIEW' })
      renderPage()

      await screen.findByText('Verification required to publish')
      expect(screen.queryByRole('link', { name: 'Go to organization profile' })).not.toBeInTheDocument()
    })

    it('leaves the other lifecycle commands alone — only publish and resume are gated', async () => {
      stubApi({ status: 'DRAFT' })
      renderPage()

      // Cancel is not a verification-gated action; gating it would disable a control the backend
      // would have accepted.
      await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled())
    })
  })

  describe('a stale client', () => {
    /**
     * The gate is a courtesy, not the boundary. If verification lapses between the profile fetch
     * and the click, the server answers ORGANIZATION_NOT_VERIFIED and that specific business error
     * must be shown — never a generic "something went wrong".
     */
    it('maps a racing ORGANIZATION_NOT_VERIFIED to its own message, not a generic error', async () => {
      stubApi({ status: 'VERIFIED', publishRejects: true })
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: 'Publish' }))

      // The code-keyed copy, not opportunities:actions.errors.generic.
      expect(
        await screen.findByText('Your organization must be verified before publishing opportunities.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument()
    })
  })
})
