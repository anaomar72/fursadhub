import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { SavedInternshipsPage } from '../../../src/features/student/pages/SavedInternshipsPage'
import i18n from '../../../src/lib/i18n'

/**
 * Regression cover for a defect reproduced live against the running backend during the Phase C/D
 * sweep: a VERIFIED, enrolled student who has never saved profile details was shown
 * "Something went wrong — We could not load your saved internships."
 *
 * The student profile is optional (`StudentEnrollmentService` never creates or requires one), and
 * `SavedOpportunityService` is keyed on it, so the endpoint answers 404 STUDENT_PROFILE_NOT_FOUND
 * for those accounts. Nothing has gone wrong: saving requires a profile, so such a student has
 * provably saved nothing. The truthful rendering is the empty state.
 */
describe('SavedInternshipsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  const json = (body: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

  function mockFetch(savedResponse: () => Promise<Response>) {
    return vi.fn((input: RequestInfo | URL) => {
      const path = String(input)
      if (path.includes('/auth/refresh')) return json({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (path.includes('/students/me/saved-opportunities')) return savedResponse()
      if (path.includes('/students/me/candidacies')) return json([])
      throw new Error(`Unexpected request: ${path}`)
    })
  }

  it('shows the empty state, not an error, when the student has no profile yet', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() =>
        json(
          { code: 'STUDENT_PROFILE_NOT_FOUND', message: 'Student profile not found.', status: 404, fieldErrors: [] },
          404,
        ),
      ),
    )

    render(
      <MemoryRouter>
        <AppProviders>
          <SavedInternshipsPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/you have not saved any internships yet/i)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /complete your profile/i })).toBeInTheDocument()
    // The defect: this copy must not appear for a healthy profile-less account.
    expect(screen.queryByText(/we could not load your saved internships/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it('still surfaces a real failure as an error with a retry', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() =>
        json({ code: 'INTERNAL_ERROR', message: 'boom', status: 500, fieldErrors: [] }, 500),
      ),
    )

    render(
      <MemoryRouter>
        <AppProviders>
          <SavedInternshipsPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/we could not load your saved internships/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    // The raw backend message must never reach the DOM (CLAUDE.md section 11).
    expect(screen.queryByText(/boom/i)).not.toBeInTheDocument()
  })
})
