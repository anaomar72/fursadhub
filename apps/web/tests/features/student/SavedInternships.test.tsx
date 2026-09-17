import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { SavedInternshipsPage } from '../../../src/features/student/pages/SavedInternshipsPage'
import { BrowseOpportunitiesPage } from '../../../src/features/opportunities/pages/BrowseOpportunitiesPage'
import { chunkOpportunityIds, SAVED_STATUS_MAX_IDS } from '../../../src/features/student/hooks/useSavedOpportunities'
import { buildStudentNav } from '../../../src/features/student/components/studentNavigation'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function noContent() {
  return Promise.resolve(new Response(null, { status: 204 }))
}

function opportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    title: 'Frontend Developer Intern',
    organization: { id: 'org-1', name: 'TechSolutions', verified: true, slug: 'tech', type: 'COMPANY', hasLogo: false },
    description: 'Build interfaces.',
    responsibilities: null,
    requirements: null,
    mode: 'PUBLIC',
    numberOfOpenings: 2,
    workMode: 'ONSITE',
    location: 'Mogadishu',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    applicationDeadline: '2026-09-20',
    skills: [],
    perks: [],
    publishedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

interface Calls {
  urls: string[]
  saved: string[]
  unsaved: string[]
  statusRequests: string[][]
}

let calls: Calls

function stubApi({
  listItems = [] as unknown[],
  savedIds = [] as string[],
  browseItems = [] as unknown[],
  listFails = false,
  statusFails = false,
} = {}) {
  calls = { urls: [], saved: [], unsaved: [], statusRequests: [] }

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.urls.push(url)
      const method = init?.method ?? 'GET'

      if (url.includes('/auth/refresh')) {
        return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      }

      if (url.includes('/saved-opportunities/status')) {
        if (statusFails) {
          return jsonResponse({ code: 'ACCESS_DENIED', message: '', status: 403, path: '', timestamp: '', fieldErrors: [] }, 403)
        }
        const requested = [...new URL(url, 'http://x').searchParams.getAll('opportunityId')]
        calls.statusRequests.push(requested)
        return jsonResponse({ savedOpportunityIds: savedIds.filter((id) => requested.includes(id)) })
      }

      if (url.includes('/saved-opportunities')) {
        const id = url.split('/saved-opportunities/')[1]
        if (method === 'POST') {
          calls.saved.push(id)
          // The stub keeps server state, so the refetch that follows the mutation agrees with it.
          if (!savedIds.includes(id)) savedIds.push(id)
          return noContent()
        }
        if (method === 'DELETE') {
          calls.unsaved.push(id)
          const at = savedIds.indexOf(id)
          if (at >= 0) savedIds.splice(at, 1)
          return noContent()
        }
        if (listFails) {
          return jsonResponse({ code: 'SERVER_ERROR', message: '', status: 500, path: '', timestamp: '', fieldErrors: [] }, 500)
        }
        return jsonResponse({
          content: listItems,
          page: 0,
          size: 12,
          totalElements: listItems.length,
          totalPages: 1,
        })
      }

      if (url.includes('/students/me/candidacies')) return jsonResponse([])
      if (url.includes('/public/opportunities')) {
        return jsonResponse({ content: browseItems, page: 0, size: 9, totalElements: browseItems.length, totalPages: 1 })
      }
      return jsonResponse({})
    }),
  )
}

function renderSaved() {
  return render(
    <MemoryRouter initialEntries={['/student/saved']}>
      <AppProviders>
        <SavedInternshipsPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

function renderBrowse() {
  return render(
    <MemoryRouter initialEntries={['/student/opportunities']}>
      <AppProviders>
        <BrowseOpportunitiesPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('Saved internships (Backend Phase B4)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  describe('navigation', () => {
    it('exposes Saved internships in the student menu', () => {
      const items = buildStudentNav(i18n.t.bind(i18n)).flatMap((section) => section.items)
      const saved = items.find((item) => item.to === '/student/saved')

      expect(saved).toBeDefined()
      expect(saved?.label).toBe('Saved internships')
    })

    it('does not offer the saved route anywhere outside the student area', () => {
      const items = buildStudentNav(i18n.t.bind(i18n)).flatMap((section) => section.items)
      // Every student destination stays under /student or the role-neutral /account area; nothing
      // here reaches into another tenant's portal. '/account' itself counts — the settings entry
      // points at the section root, whose index redirects to /account/profile.
      expect(
        items.every(
          (item) => item.to.startsWith('/student/') || item.to === '/account' || item.to.startsWith('/account/'),
        ),
      ).toBe(true)
    })
  })

  describe('list states', () => {
    it('renders an empty state inviting the student to browse', async () => {
      stubApi({ listItems: [] })
      renderSaved()

      expect(await screen.findByText('You have not saved any internships yet')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Explore internships' })).toHaveAttribute(
        'href',
        '/student/opportunities',
      )
    })

    it('renders saved rows with the date they were saved', async () => {
      stubApi({ listItems: [{ savedAt: '2026-05-09T10:00:00Z', opportunity: opportunity() }] })
      renderSaved()

      expect(await screen.findByRole('link', { name: /frontend developer intern/i })).toBeInTheDocument()
      // The card footer carries the save date, formatted for the reader's locale ("Saved May 9,
      // 2026"). Anchored so it does not also match the page heading, "Saved internships".
      expect(screen.getByText(/^Saved \w+ \d/)).toBeInTheDocument()
      expect(screen.getByText('1 saved internship')).toBeInTheDocument()
    })

    it('shows a retryable error state rather than an empty list when the request fails', async () => {
      stubApi({ listFails: true })
      renderSaved()

      expect(await screen.findByText('We could not load your saved internships.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    })

    /**
     * The server omits a bookmark whose internship is no longer publicly discoverable, and its
     * totals describe only that visible set. The page must render exactly what it was given — no
     * fabricated "no longer available" row, and no attempt to reach past public visibility.
     */
    it('renders only what the server returned, never a placeholder for an invisible bookmark', async () => {
      stubApi({ listItems: [] })
      renderSaved()

      await screen.findByText('You have not saved any internships yet')
      expect(screen.queryByText(/no longer available/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/deleted/i)).not.toBeInTheDocument()
    })

    it('does not ask for saved status on a page where every row is saved by definition', async () => {
      stubApi({ listItems: [{ savedAt: '2026-05-09T10:00:00Z', opportunity: opportunity() }] })
      renderSaved()

      await screen.findByRole('link', { name: /frontend developer intern/i })
      expect(calls.urls.some((url) => url.includes('/saved-opportunities/status'))).toBe(false)
    })
  })

  describe('bookmark on the discovery listing', () => {
    it('asks for the whole page of saved statuses in ONE request, not one per card', async () => {
      const items = [
        opportunity({ id: 'a', title: 'Alpha Intern' }),
        opportunity({ id: 'b', title: 'Beta Intern' }),
        opportunity({ id: 'c', title: 'Gamma Intern' }),
      ]
      stubApi({ browseItems: items, savedIds: ['b'] })
      renderBrowse()

      await screen.findByRole('link', { name: /alpha intern/i })
      await waitFor(() => expect(calls.statusRequests.length).toBe(1))
      expect(calls.statusRequests[0]).toEqual(['a', 'b', 'c'])
    })

    it('marks the saved card as pressed and the others as not', async () => {
      const items = [opportunity({ id: 'a', title: 'Alpha Intern' }), opportunity({ id: 'b', title: 'Beta Intern' })]
      stubApi({ browseItems: items, savedIds: ['b'] })
      renderBrowse()

      await waitFor(() => expect(screen.getAllByRole('button', { name: /save|remove from saved/i })).toHaveLength(2))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Remove from saved' })).toHaveAttribute('aria-pressed', 'true'))
      expect(screen.getByRole('button', { name: 'Save internship' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('saves an unsaved internship and flips the control', async () => {
      stubApi({ browseItems: [opportunity({ id: 'a' })], savedIds: [] })
      renderBrowse()

      const button = await screen.findByRole('button', { name: 'Save internship' })
      await userEvent.click(button)

      await waitFor(() => expect(calls.saved).toEqual(['a']))
      expect(await screen.findByRole('button', { name: 'Remove from saved' })).toBeInTheDocument()
    })

    it('unsaves a saved internship through DELETE, not a second POST', async () => {
      stubApi({ browseItems: [opportunity({ id: 'a' })], savedIds: ['a'] })
      renderBrowse()

      await userEvent.click(await screen.findByRole('button', { name: 'Remove from saved' }))

      await waitFor(() => expect(calls.unsaved).toEqual(['a']))
      expect(calls.saved).toEqual([])
    })

    /**
     * The status endpoint is student-only. Anyone else gets an error, and the bookmark is then
     * hidden rather than rendered as a control that cannot work.
     */
    it('hides the bookmark entirely when the saved-status endpoint refuses the caller', async () => {
      stubApi({ browseItems: [opportunity({ id: 'a' })], statusFails: true })
      renderBrowse()

      await screen.findByRole('link', { name: /frontend developer intern/i })
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /save internship|remove from saved/i })).not.toBeInTheDocument(),
      )
    })
  })

  describe('batching bound', () => {
    /**
     * `SavedOpportunityController` caps the RAW id list at 50 and answers a longer one with
     * VALIDATION_FAILED, so a longer listing must be split rather than truncated — truncating would
     * render the tail of the page with silently wrong bookmark state.
     */
    it('splits more than the server bound into deliberate chunks, losing nothing', () => {
      const ids = Array.from({ length: 123 }, (_, index) => `id-${index}`)
      const chunks = chunkOpportunityIds(ids)

      expect(chunks).toHaveLength(3)
      expect(chunks.every((chunk) => chunk.length <= SAVED_STATUS_MAX_IDS)).toBe(true)
      expect(chunks.flat()).toEqual(ids)
    })

    it('produces a single chunk for an ordinary page of cards', () => {
      expect(chunkOpportunityIds(['a', 'b', 'c'])).toEqual([['a', 'b', 'c']])
    })

    it('asks for nothing at all when there is nothing on screen', () => {
      expect(chunkOpportunityIds([])).toEqual([])
    })
  })
})
