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

const OPPORTUNITY = { id: 'opp-1', title: 'Backend Intern', status: 'PUBLISHED', mode: 'HYBRID' }

function stubFetch(candidates: unknown[]) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/candidacies')) return jsonResponse(candidates)
    if (url.includes('/opportunities/')) return jsonResponse(OPPORTUNITY)
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

  it('groups the board by the REAL backend statuses, not the prototype labels', async () => {
    // The approved design's columns (New / Reviewing / Shortlisted / Interview / Accepted) are not
    // statuses. The board uses the domain's own states — and includes OFFERED, which the prototype
    // left out entirely even though a candidate genuinely sits there (CLAUDE.md section 37).
    stubFetch([applicant, nominee, both])
    renderPage()

    const board = await screen.findByRole('list', { name: 'Candidate pipeline by stage' })

    expect(board).toHaveTextContent('Submitted')
    expect(board).toHaveTextContent('Under review')
    expect(board).toHaveTextContent('Shortlisted')
    expect(board).toHaveTextContent('Interview')
    expect(board).toHaveTextContent('Offer sent')
    expect(board).toHaveTextContent('Accepted')
    // Terminal states are not stages and get no column.
    expect(board).not.toHaveTextContent('Rejected')
    expect(board).not.toHaveTextContent('Withdrawn')
  })

  it('never offers a control that would move a candidate without the API agreeing', async () => {
    // Stage changes are named commands on the candidate's own page. A draggable board would either
    // guess which moves are legal or show a move the server then rejects.
    stubFetch([applicant])
    renderPage()

    const board = await screen.findByRole('list', { name: 'Candidate pipeline by stage' })
    expect(board.querySelector('[draggable="true"]')).toBeNull()
    expect(board.querySelectorAll('button')).toHaveLength(0)
  })

  it('renders each candidacy source on its row in the list view', async () => {
    stubFetch([applicant, nominee, both])
    renderPage()

    await screen.findByText('Hodan Farah')
    await userEvent.click(screen.getByRole('tab', { name: 'List' }))

    const rows = await screen.findAllByRole('row')
    // One header row plus one per candidate.
    expect(rows).toHaveLength(4)
    expect(rows[1]).toHaveTextContent('Applied directly')
    expect(rows[2]).toHaveTextContent('University nomination')
    expect(rows[3]).toHaveTextContent('Applied and nominated')
  })

  it('defaults to no source filter in the request', async () => {
    const fetchMock = stubFetch([applicant])
    renderPage()

    await screen.findByText('Amina Yusuf')

    const poolCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/candidacies'))!
    expect(String(poolCall[0])).not.toContain('source=')
  })

  it('sends the source filter to the server, which genuinely supports it', async () => {
    const fetchMock = stubFetch([nominee])
    renderPage()

    await screen.findByText('Omar Ali')
    await userEvent.selectOptions(screen.getByLabelText('Source'), 'UNIVERSITY_NOMINATION')

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).includes('source=UNIVERSITY_NOMINATION')),
      ).toBe(true)
    })
  })

  it('narrows by stage on the client, because the endpoint has no stage filter', async () => {
    const fetchMock = stubFetch([applicant, nominee])
    renderPage()

    await screen.findByText('Amina Yusuf')
    const callsBefore = fetchMock.mock.calls.length

    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'SHORTLISTED')

    await waitFor(() => {
      expect(screen.queryByText('Amina Yusuf')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Omar Ali')).toBeInTheDocument()
    // No extra request: GET /opportunities/{id}/candidacies accepts only `source`.
    expect(fetchMock.mock.calls.length).toBe(callsBefore)
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
