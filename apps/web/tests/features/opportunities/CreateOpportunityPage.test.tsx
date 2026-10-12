import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CreateOpportunityPage } from '../../../src/features/opportunities/pages/CreateOpportunityPage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function renderPage(role: 'ORGANIZATION_ADMIN' | 'RECRUITER' | 'ORGANIZATION_SUPERVISOR' = 'ORGANIZATION_ADMIN') {
  return render(
    <MemoryRouter initialEntries={['/organization/opportunities/new']}>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: 'org-1', role }}>
          <CreateOpportunityPage />
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('CreateOpportunityPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) {
          return jsonResponse({ code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }, 401)
        }
        return jsonResponse({}, 200)
      }),
    )
  })

  it('offers all three sourcing modes as one explained choice', () => {
    renderPage()

    // Phase 6: a radio group, not a bare select — each mode carries what it means.
    const group = screen.getByRole('group', { name: /sourcing mode/i })
    const modes = within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))

    expect(modes).toEqual(['PUBLIC', 'UNIVERSITY_TARGETED', 'HYBRID'])
    expect(within(group).getByRole('radio', { name: 'Public' })).toBeChecked()
    expect(within(group).getByText(/only nominated students/i)).toBeInTheDocument()
  })

  it('says targets are chosen later, and relaxes the deadline only for a targeted internship', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.queryByText(/choose which universities and departments/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/application deadline/i)).toBeRequired()

    await user.click(screen.getByRole('radio', { name: 'University-targeted' }))

    expect(screen.getByRole('radio', { name: 'University-targeted' })).toBeChecked()
    expect(await screen.findByText(/choose which universities and departments/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/application deadline/i)).not.toBeRequired()
  })

  it('rejects an end date that is not after the start date', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^title$/i), 'Backend Intern')
    await user.type(screen.getByLabelText(/^description$/i), 'Work on the API.')
    await user.type(screen.getByLabelText(/start date/i), '2027-06-01')
    await user.type(screen.getByLabelText(/end date/i), '2027-03-01')
    await user.type(screen.getByLabelText(/application deadline/i), '2027-05-01')
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    expect(await screen.findByText(/end date must be after the start date/i)).toBeInTheDocument()
  })

  it('requires an application deadline before the start date', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^title$/i), 'Backend Intern')
    await user.type(screen.getByLabelText(/^description$/i), 'Work on the API.')
    await user.type(screen.getByLabelText(/start date/i), '2027-03-01')
    await user.type(screen.getByLabelText(/end date/i), '2027-06-01')
    await user.type(screen.getByLabelText(/application deadline/i), '2027-04-01')
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    expect(await screen.findByText(/deadline must be before the start date/i)).toBeInTheDocument()
  })

  it('rejects fewer than one opening', async () => {
    const user = userEvent.setup()
    renderPage()

    const openings = screen.getByLabelText(/number of openings/i)
    await user.clear(openings)
    await user.type(openings, '0')
    await user.type(screen.getByLabelText(/^title$/i), 'Backend Intern')
    await user.type(screen.getByLabelText(/^description$/i), 'Work on the API.')
    await user.type(screen.getByLabelText(/start date/i), '2027-03-01')
    await user.type(screen.getByLabelText(/end date/i), '2027-06-01')
    await user.type(screen.getByLabelText(/application deadline/i), '2027-02-01')
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    expect(await screen.findByText(/at least one opening/i)).toBeInTheDocument()
  })

  /**
   * CreateOpportunityService admits ORGANIZATION_ADMIN and RECRUITER only. The sidebar already
   * omits this destination for a supervisor, but a typed URL still reaches the route — and a form
   * whose every submit returns 403 is worse than an honest explanation.
   *
   * Frontend only: the backend re-authorizes the request regardless (CLAUDE.md section 24).
   */
  describe('authorization', () => {
    it.each(['ORGANIZATION_ADMIN', 'RECRUITER'] as const)('gives %s the create form', (role) => {
      renderPage(role)

      expect(screen.getByLabelText('Title')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create draft' })).toBeInTheDocument()
    })

    it('gives an ORGANIZATION_SUPERVISOR an explanation instead of a form that cannot submit', () => {
      renderPage('ORGANIZATION_SUPERVISOR')

      expect(screen.getByText('You cannot create internships')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Create draft' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    })

    it('still offers the supervisor a way back to the internship list', () => {
      renderPage('ORGANIZATION_SUPERVISOR')

      // The breadcrumb and the empty state's action both offer the way back, and both must lead
      // to the list rather than leaving the supervisor on a dead end.
      const backLinks = screen.getAllByRole('link', { name: 'Internships' })
      expect(backLinks.length).toBeGreaterThan(0)
      for (const link of backLinks) {
        expect(link).toHaveAttribute('href', '/organization/opportunities')
      }
    })
  })

  it('renders Somali translations when the language is Somali', async () => {
    await i18n.changeLanguage('so')
    renderPage()

    expect(screen.getByRole('heading', { name: /tababar cusub/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /habka raadinta/i })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
