import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminTestimonialsPage } from '../../../src/features/admin/pages/AdminTestimonialsPage'
import i18n from '../../../src/lib/i18n'
import type { Testimonial } from '../../../src/features/testimonials/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function testimonial(overrides: Partial<Testimonial> = {}): Testimonial {
  return {
    id: 'testimonial-1',
    authorDisplayName: 'Yusuf A.',
    authorRole: 'RECRUITER',
    authorAudience: 'ORGANIZATION',
    authorAffiliation: 'Acme Ltd',
    rating: 5,
    body: 'We filled three internship openings without running our own campus process.',
    status: 'SUBMITTED',
    submittedAt: '2026-09-08T09:00:00Z',
    moderatedAt: null,
    moderationNote: null,
    ...overrides,
  }
}

function stubFetch(rows: Testimonial[] = [testimonial()]) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    if (String(input).includes('/admin/testimonials')) {
      return jsonResponse({
        content: rows,
        page: 0,
        size: 25,
        totalElements: rows.length,
        totalPages: 1,
      })
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <AdminTestimonialsPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AdminTestimonialsPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  /*
   * `attribution.ts` exists so a quote cannot be labelled one way on the home page and another way
   * in the console. This is the console half of that claim: the moderation queue prints the same
   * server-derived line the public card does.
   */
  it('shows the moderator the server derived attribution, matching the public card', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('Yusuf A.')).toBeInTheDocument()
    expect(screen.getByText('Recruiter at Acme Ltd')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Awaiting review')).toBeInTheDocument()
  })

  it('falls back to the audience wording for a row written before roles were derived', async () => {
    stubFetch([
      testimonial({
        id: 'legacy-1',
        authorDisplayName: 'Cabdi S.',
        // Nothing is backfilled by V52, so the moderator sees the absence rather than a guess.
        authorRole: null,
        authorAudience: 'UNIVERSITY',
        authorAffiliation: null,
        rating: null,
      }),
    ])
    renderPage()

    expect(await screen.findByText('Cabdi S.')).toBeInTheDocument()
    expect(screen.getByText('University')).toBeInTheDocument()
  })

  /*
   * A testimonial an administrator rewrote is not a testimonial. The queue offers state commands
   * and nothing else, so there must be no editable control holding the author's words.
   */
  it('shows the rating the moderator is about to publish', async () => {
    stubFetch()
    renderPage()

    // The rating goes public with the quote, so it has to be visible before the publish decision.
    expect(await screen.findByText('5 out of 5')).toBeInTheDocument()
  })

  it('offers no way to edit the quote', async () => {
    stubFetch()
    renderPage()

    const quote = await screen.findByText(/filled three internship openings/)
    expect(quote.tagName.toLowerCase()).toBe('blockquote')
    expect(screen.queryByDisplayValue(/filled three internship openings/)).not.toBeInTheDocument()
    // The only textarea on the page is the moderator's own reason, which appears when prompted.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('offers publish and reject on a submitted testimonial, and neither on a rejected one', async () => {
    stubFetch()
    const { unmount } = renderPage()

    expect(await screen.findByRole('button', { name: 'Publish' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    unmount()

    // REJECTED is terminal in the backend state machine; the queue must not offer a dead command.
    stubFetch([testimonial({ status: 'REJECTED', moderationNote: 'Could not confirm the placement' })])
    renderPage()

    expect(await screen.findByText('Not published')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })
})
