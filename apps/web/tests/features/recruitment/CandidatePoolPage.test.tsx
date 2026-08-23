import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CandidatePoolPage } from '../../../src/features/recruitment/pages/CandidatePoolPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const applicant = {
  candidacyId: 'cand-1',
  studentUserId: 'stu-1',
  studentEmail: 'amina@example.test',
  studentFullName: 'Amina Yusuf',
  source: 'SELF_APPLICATION',
  status: 'SUBMITTED',
  createdAt: '2026-08-01T00:00:00Z',
  liveOffer: null,
}

const nominee = {
  ...applicant,
  candidacyId: 'cand-2',
  studentUserId: 'stu-2',
  studentEmail: 'omar@example.test',
  studentFullName: 'Omar Ali',
  source: 'UNIVERSITY_NOMINATION',
  status: 'SHORTLISTED',
}

const both = {
  ...applicant,
  candidacyId: 'cand-3',
  studentUserId: 'stu-3',
  studentFullName: 'Hodan Farah',
  source: 'BOTH',
  status: 'UNDER_REVIEW',
}

function stubFetch(candidates: unknown[]) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    if (String(input).includes('/candidacies')) {
      return jsonResponse(candidates)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/organization/opportunities/opp-1/candidates']}>
      <AppProviders>
        <Routes>
          <Route path="/organization/opportunities/:opportunityId/candidates" element={<CandidatePoolPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('CandidatePoolPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  /** The core Phase 4 product rule: one pool, not separate applicant/nominee pipelines. */
  it('shows applicants and nominees together in one pool', async () => {
    stubFetch([applicant, nominee, both])
    renderPage()

    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.getByText('Omar Ali')).toBeInTheDocument()
    expect(screen.getByText('Hodan Farah')).toBeInTheDocument()
  })

  it('renders each candidacy source on its row', async () => {
    stubFetch([applicant, nominee, both])
    renderPage()

    // Wait for the rows themselves — the filter buttons reuse these same source labels, so assert
    // within list items rather than over the whole document.
    await screen.findByText('Hodan Farah')
    const rows = screen.getAllByRole('listitem')

    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Applied directly')
    expect(rows[1]).toHaveTextContent('University nomination')
    expect(rows[2]).toHaveTextContent('Applied and nominated')
  })

  it('defaults to no source filter in the request', async () => {
    const fetchMock = stubFetch([applicant])
    renderPage()

    await screen.findByText('Amina Yusuf')

    const poolCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/candidacies'))!
    expect(String(poolCall[0])).not.toContain('source=')
  })

  it('requests a filtered pool when a source filter is chosen', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch([nominee])
    renderPage()

    await screen.findByText('Omar Ali')
    await user.click(screen.getByRole('button', { name: /university nomination/i }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).includes('source=UNIVERSITY_NOMINATION')),
      ).toBe(true)
    })
  })

  it('marks the active filter with aria-pressed', async () => {
    const user = userEvent.setup()
    stubFetch([applicant])
    renderPage()

    await screen.findByText('Amina Yusuf')
    expect(screen.getByRole('button', { name: /all candidates/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /applied directly/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /applied directly/i })).toHaveAttribute('aria-pressed', 'true')
    })
    expect(screen.getByRole('button', { name: /all candidates/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows an empty state when the pool has no candidates', async () => {
    stubFetch([])
    renderPage()

    expect(await screen.findByText(/no candidates yet/i)).toBeInTheDocument()
  })

  it('renders Somali translations when the language is Somali', async () => {
    stubFetch([applicant])
    await i18n.changeLanguage('so')

    renderPage()

    expect(await screen.findByRole('heading', { name: /musharrixiinta/i })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
