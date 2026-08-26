import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { FinalReportPage } from '../../../src/features/final-reports/pages/FinalReportPage'
import i18n from '../../../src/lib/i18n'
import type { FinalReportResponse } from '../../../src/features/final-reports/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function report(overrides: Partial<FinalReportResponse> = {}): FinalReportResponse {
  return {
    id: 'fr-1',
    placementId: 'pl-1',
    state: 'DRAFT',
    hasDocument: false,
    documentFilename: null,
    documentSizeBytes: null,
    submittedAt: null,
    reviewedAt: null,
    reviewComment: null,
    fileEditable: true,
    createdAt: '2026-12-01T00:00:00Z',
    updatedAt: '2026-12-01T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(current: FinalReportResponse | null, onCommand?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST' && url.includes('/final-report')) {
      return onCommand ? onCommand(url) : jsonResponse(current ?? report())
    }
    if (url.includes('/final-report')) {
      return current ? jsonResponse(current) : Promise.resolve(new Response(null, { status: 204 }))
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(audience: 'student' | 'reviewer') {
  return render(
    <MemoryRouter initialEntries={['/student/placements/pl-1/final-report']}>
      <AppProviders>
        <Routes>
          <Route
            path="/student/placements/:placementId/final-report"
            element={<FinalReportPage audience={audience} />}
          />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('FinalReportPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('offers the upload control and states the PDF-only policy', async () => {
    stubFetch(null)
    renderPage('student')

    expect(await screen.findByLabelText('Report document')).toBeInTheDocument()
    expect(screen.getByText('PDF only, up to 15 MB.')).toBeInTheDocument()
    // The picker itself is restricted, so the obvious wrong file is caught before any request.
    expect(screen.getByLabelText('Report document')).toHaveAttribute('accept', 'application/pdf')
  })

  it('never renders a link to the document', async () => {
    stubFetch(
      report({ state: 'SUBMITTED', hasDocument: true, documentFilename: 'report.pdf', documentSizeBytes: 2048, fileEditable: false }),
    )
    renderPage('reviewer')

    expect(await screen.findByText('report.pdf')).toBeInTheDocument()
    // The document is fetched through the authorized API and handed over as a blob; a private
    // academic submission must never be reachable through a copyable href.
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument()
  })

  it('shows revision feedback and lets the student replace the document', async () => {
    stubFetch(
      report({
        state: 'NEEDS_REVISION',
        hasDocument: true,
        documentFilename: 'v1.pdf',
        documentSizeBytes: 1024,
        reviewComment: 'Expand the reflection.',
        fileEditable: true,
      }),
    )
    renderPage('student')

    expect(await screen.findByText('Reviewer feedback: Expand the reflection.')).toBeInTheDocument()
    expect(screen.getByText('Revision requested')).toBeInTheDocument()
    expect(screen.getByLabelText('Report document')).toBeInTheDocument()
  })

  it('offers a student no review controls', async () => {
    stubFetch(
      report({ state: 'SUBMITTED', hasDocument: true, documentFilename: 'report.pdf', fileEditable: false }),
    )
    renderPage('student')

    await screen.findByText('Awaiting review')
    expect(screen.queryByRole('button', { name: 'Approve report' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request revision' })).not.toBeInTheDocument()
  })

  it('locks an approved report against replacement', async () => {
    stubFetch(
      report({ state: 'APPROVED', hasDocument: true, documentFilename: 'report.pdf', fileEditable: false }),
    )
    renderPage('student')

    await screen.findByText('Approved')
    expect(screen.queryByLabelText('Report document')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument()
  })

  it('will not send a revision request without an explanation', async () => {
    const fetchMock = stubFetch(
      report({ state: 'SUBMITTED', hasDocument: true, documentFilename: 'report.pdf', fileEditable: false }),
    )
    renderPage('reviewer')

    await userEvent.click(await screen.findByRole('button', { name: 'Request revision' }))
    const confirm = screen.getByRole('button', { name: 'Send back to student' })

    expect(confirm).toBeDisabled()
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/request-revision'))).toHaveLength(0)
  })

  it('translates a rejected submission from its machine-readable code', async () => {
    stubFetch(
      report({ hasDocument: true, documentFilename: 'report.pdf', documentSizeBytes: 1024 }),
      () =>
        jsonResponse(
          {
            code: 'FINAL_REPORT_INVALID_TRANSITION',
            // Deliberately different from the copy asserted below: the UI must key off the CODE.
            message: 'Server-side English that the UI must not display.',
            status: 409,
            path: '/api/v1/placements/pl-1/final-report/submit',
            timestamp: '2026-12-01T00:00:00Z',
            fieldErrors: [],
          },
          409,
        ),
    )
    renderPage('student')

    await userEvent.click(await screen.findByRole('button', { name: 'Submit for review' }))

    expect(
      await screen.findByText('The report can no longer be changed that way.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Server-side English that the UI must not display.'),
    ).not.toBeInTheDocument()
  })

  it('renders in Somali when the language is Somali', async () => {
    await i18n.changeLanguage('so')
    stubFetch(report({ state: 'APPROVED', hasDocument: true, documentFilename: 'report.pdf', fileEditable: false }))
    renderPage('student')

    expect(await screen.findByText('Warbixinta ugu dambaysa')).toBeInTheDocument()
    expect(screen.getByText('La ansixiyay')).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
