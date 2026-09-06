import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CandidateDetailPage } from '../../../src/features/recruitment/pages/CandidateDetailPage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { MyOrganizationMembershipResponse } from '../../../src/features/organization/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const membership = (role: string) =>
  ({
    organizationId: 'org-1',
    organizationName: 'TechSolutions',
    role,
  }) as unknown as MyOrganizationMembershipResponse

const CANDIDATE = {
  id: 'cand-1',
  opportunityId: 'opp-1',
  studentUserId: 'stu-1',
  studentFullName: 'Hodan Warsame',
  studentEmail: 'hodan@example.test',
  status: 'SHORTLISTED',
  source: 'SELF_APPLICATION',
  answers: [],
  offers: [],
  history: [],
}

function stubFetch(onCv?: () => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/candidacies/cand-1/cv')) {
      return onCv ? onCv() : Promise.resolve(new Response(new Blob(['pdf']), { status: 200 }))
    }
    if (url.includes('/candidacies/cand-1')) return jsonResponse(CANDIDATE)
    if (url.includes('/screening-questions')) return jsonResponse([])
    if (url.includes('/opportunities/opp-1')) return jsonResponse({ id: 'opp-1', title: 'Backend intern' })
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(role = 'RECRUITER') {
  return render(
    <MemoryRouter initialEntries={['/organization/candidacies/cand-1']}>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={membership(role)}>
          <Routes>
            <Route path="/organization/candidacies/:candidacyId" element={<CandidateDetailPage />} />
          </Routes>
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('candidate CV', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stub')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    await i18n.changeLanguage('en')
  })

  it('fetches the CV by candidacy, not by student', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Open CV' }))

    await waitFor(() => {
      const requested = fetchMock.mock.calls.map(([url]) => String(url))
      // Authorized from the recruiting relationship; there is no /students/{id}/cv route to hit.
      expect(requested.some((url) => url.includes('/candidacies/cand-1/cv'))).toBe(true)
      expect(requested.some((url) => /\/students\/[^/]+\/cv/.test(url))).toBe(false)
    })
  })

  it('says the candidate has no CV rather than failing silently', async () => {
    stubFetch(() =>
      jsonResponse(
        {
          code: 'CV_NOT_FOUND',
          message: 'raw backend text',
          status: 404,
          path: '/x',
          timestamp: '',
          fieldErrors: [],
        },
        404,
      ),
    )
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Open CV' }))

    expect(await screen.findByText('This candidate has not uploaded a CV.')).toBeInTheDocument()
  })

  it('is offered to an organization supervisor too, and the API decides', async () => {
    // A supervisor gets no recruitment COMMANDS, but the CV control is not gated client-side —
    // CandidacyAuthorization answers, and a wrong guess here would hide a legitimate action.
    stubFetch()
    renderPage('ORGANIZATION_SUPERVISOR')

    expect(await screen.findByRole('button', { name: 'Open CV' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Shortlist' })).not.toBeInTheDocument()
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByRole('button', { name: 'Fur CV-ga' })).toBeInTheDocument()
  })
})
