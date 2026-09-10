import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminOrganizationsPage } from '../../../src/features/admin/pages/AdminOrganizationsPage'
import { AdminOrganizationDetailPage } from '../../../src/features/admin/pages/AdminOrganizationDetailPage'
import { AdminUniversityDetailPage } from '../../../src/features/admin/pages/AdminUniversityDetailPage'
import { INSTITUTION_ACTIONS } from '../../../src/features/admin/institutionWorkflow'
import i18n from '../../../src/lib/i18n'
import type { AdminOrganization, InstitutionVerificationStatus } from '../../../src/features/admin/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function organization(overrides: Partial<AdminOrganization> = {}): AdminOrganization {
  return {
    id: 'org-1',
    name: 'TechSolutions',
    slug: 'techsolutions',
    type: 'COMPANY',
    registrationNumber: 'REG-77',
    website: 'https://techsolutions.test',
    verificationStatus: 'SUBMITTED',
    verifiedAt: null,
    hasEvidence: true,
    evidenceUploadedAt: '2026-08-01T00:00:00Z',
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(record: AdminOrganization, onCommand?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url) : jsonResponse(record)
    }
    if (/\/admin\/(organizations|universities)\/[^/?]+$/.test(url)) return jsonResponse(record)
    if (url.includes('/admin/organizations') || url.includes('/admin/universities')) {
      return jsonResponse({ content: [record], page: 0, size: 25, totalElements: 1, totalPages: 1 })
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderDetail(kind: 'organizations' | 'universities' = 'organizations') {
  const Page = kind === 'organizations' ? AdminOrganizationDetailPage : AdminUniversityDetailPage
  const param = kind === 'organizations' ? ':organizationId' : ':universityId'
  return render(
    <MemoryRouter initialEntries={[`/admin/${kind}/org-1`]}>
      <AppProviders>
        <Routes>
          <Route path={`/admin/${kind}/${param}`} element={<Page />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

function renderQueue() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <AdminOrganizationsPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('institution verification workflow', () => {
  it('offers only the transitions the frozen state machine allows', () => {
    // Terminal and institution-owned states offer nothing; the machine lives on the backend and
    // this map only mirrors it.
    for (const terminal of ['DRAFT', 'NEEDS_CHANGES', 'REJECTED', 'REVOKED'] as InstitutionVerificationStatus[]) {
      expect(INSTITUTION_ACTIONS[terminal]).toEqual([])
    }
    expect(INSTITUTION_ACTIONS.SUBMITTED).toContain('verify')
    expect(INSTITUTION_ACTIONS.VERIFIED).toEqual(['suspend', 'revoke'])
    // Verifying something already rejected or revoked is never offered.
    expect(INSTITUTION_ACTIONS.REJECTED).not.toContain('verify')
  })
})

describe('AdminOrganizationsPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('opens on the submitted queue rather than every organization', async () => {
    const fetchMock = stubFetch(organization())
    renderQueue()

    await screen.findByRole('link', { name: 'TechSolutions' })
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('status=SUBMITTED'))).toBe(true)
  })

  it('sends the reviewer to the record instead of deciding from the row', async () => {
    stubFetch(organization())
    renderQueue()

    expect(await screen.findByRole('link', { name: 'TechSolutions' })).toHaveAttribute(
      'href',
      '/admin/organizations/org-1',
    )
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
  })
})

describe('AdminOrganizationDetailPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('reads the single-organization endpoint', async () => {
    const fetchMock = stubFetch(organization())
    renderDetail()

    await screen.findByRole('heading', { name: 'TechSolutions' })
    expect(fetchMock.mock.calls.some(([url]) => /\/admin\/organizations\/org-1$/.test(String(url)))).toBe(
      true,
    )
  })

  it('confirms before verifying, then calls the real command endpoint', async () => {
    const fetchMock = stubFetch(organization())
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Verify' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/admin/organizations/org-1/verify'),
      )
      expect(call).toBeDefined()
      expect((call![1] as RequestInit).method).toBe('POST')
    })
  })

  it('collects the note a refusal must carry, and sends it', async () => {
    const fetchMock = stubFetch(organization())
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    await userEvent.type(screen.getByLabelText('Note to the organization'), 'License expired')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/admin/organizations/org-1/reject'),
      )
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ note: 'License expired' })
    })
  })

  it('leaves the organization unverified when the API refuses', async () => {
    stubFetch(organization(), () =>
      jsonResponse(
        {
          code: 'ORGANIZATION_INVALID_TRANSITION',
          message: 'raw',
          status: 409,
          path: '/x',
          timestamp: '',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Verify' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))

    // The badge must never show a state the backend did not grant.
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.queryByText('Verified')).not.toBeInTheDocument()
  })

  it('offers no decision at all on a state the machine has closed', async () => {
    stubFetch(organization({ verificationStatus: 'REVOKED' }))
    renderDetail()

    expect(await screen.findByText('No actions are available from this state.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
  })

  it('fetches the license through the audited API route, never a storage URL', async () => {
    const fetchMock = stubFetch(organization())
    // jsdom cannot follow a download click; the assertion is about which URL is requested.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stub')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'View license' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes('/admin/organizations/org-1/verification/evidence/document'),
        ),
      ).toBe(true)
    })
  })

  it('hides the evidence control when nothing is on file', async () => {
    stubFetch(organization({ hasEvidence: false, evidenceUploadedAt: null }))
    renderDetail()

    expect(await screen.findByText('No license has been uploaded for this organization.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View license' })).not.toBeInTheDocument()
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch(organization())
    await i18n.changeLanguage('so')
    renderDetail()

    expect(await screen.findByText('Go’aanka xaqiijinta')).toBeInTheDocument()
  })
})

describe('AdminUniversityDetailPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('runs the same workflow against the university endpoints', async () => {
    const fetchMock = stubFetch(organization())
    renderDetail('universities')

    await userEvent.click(await screen.findByRole('button', { name: 'Verify' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('/admin/universities/org-1/verify')),
      ).toBe(true)
    })
  })
})
