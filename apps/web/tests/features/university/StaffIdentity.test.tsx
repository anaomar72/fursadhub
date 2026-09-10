import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { StaffPage } from '../../../src/features/university/pages/StaffPage'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { StaffMemberResponse } from '../../../src/features/university/types'

const UNIVERSITY_ID = 'uni-1'
const IT_DEPARTMENT = { id: 'dept-it', name: 'Information Technology' }
const MEDICINE_DEPARTMENT = { id: 'dept-med', name: 'Medicine' }

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function staffMember(overrides: Partial<StaffMemberResponse> = {}): StaffMemberResponse {
  return {
    membershipId: 'membership-1',
    userId: 'user-1',
    displayName: 'Hodan Ali',
    username: 'hodan.ali',
    email: 'hodan@example.test',
    role: 'DEPARTMENT_COORDINATOR',
    status: 'ACTIVE',
    departmentIds: [IT_DEPARTMENT.id],
    assignedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as StaffMemberResponse
}

let commands: { url: string; body: unknown }[] = []

function stubFetch(
  staff: StaffMemberResponse[] = [staffMember()],
  onCommand?: (url: string) => Promise<Response> | null,
) {
  commands = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method && init.method !== 'GET') {
        commands.push({ url, body: init.body ? JSON.parse(String(init.body)) : null })
        return onCommand?.(url) ?? jsonResponse(staffMember())
      }
      if (url.includes('/departments')) return jsonResponse([IT_DEPARTMENT, MEDICINE_DEPARTMENT])
      if (url.includes('/staff')) return jsonResponse(staff)
      return jsonResponse({})
    }),
  )
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <UniversityMembershipContext.Provider value={{ universityId: UNIVERSITY_ID, role: 'UNIVERSITY_ADMIN' }}>
          <StaffPage />
        </UniversityMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('University managed staff identity (Backend Phase B5 / B5.5)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('shows the display name first, then the email and the username', async () => {
    stubFetch([staffMember()])
    renderPage()

    expect(await screen.findByText('Hodan Ali')).toBeInTheDocument()
    expect(screen.getByText('hodan@example.test')).toBeInTheDocument()
    expect(screen.getByText('hodan.ali')).toBeInTheDocument()
  })

  it('falls back to the email verbatim for a legacy account with no display name', async () => {
    stubFetch([staffMember({ displayName: null, email: 'hcoordinator@example.test' })])
    renderPage()

    expect(await screen.findByText('hcoordinator@example.test')).toBeInTheDocument()
    // Never a name invented from the mailbox string.
    expect(screen.queryByText('hcoordinator')).not.toBeInTheDocument()
  })

  it('offers username assignment only while the account has none', async () => {
    stubFetch([staffMember({ username: null })])
    renderPage()

    expect(await screen.findByText('No username yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign username' })).toBeInTheDocument()
  })

  it('shows an existing username read-only, with no rename control', async () => {
    stubFetch([staffMember({ username: 'hodan.ali' })])
    renderPage()

    await screen.findByText('hodan.ali')
    expect(screen.queryByRole('button', { name: 'Assign username' })).not.toBeInTheDocument()
  })

  it('assigns a username through the B5.5 command', async () => {
    stubFetch([staffMember({ username: null })])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Assign username' }))
    await userEvent.type(screen.getByLabelText('Username'), 'hodan.ali')
    await userEvent.click(screen.getByRole('button', { name: 'Assign permanently' }))

    const command = await waitFor(() => {
      const call = commands.find((entry) => entry.url.endsWith('/username'))
      expect(call).toBeDefined()
      return call!
    })
    expect(command.body).toEqual({ username: 'hodan.ali' })
  })

  it('changes a display name through the B5 command', async () => {
    stubFetch([staffMember()])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Change name' }))
    const field = screen.getByLabelText('Full name')
    await userEvent.clear(field)
    await userEvent.type(field, 'Hodan A. Ali')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    const command = await waitFor(() => {
      const call = commands.find((entry) => entry.url.endsWith('/display-name'))
      expect(call).toBeDefined()
      return call!
    })
    expect(command.body).toEqual({ displayName: 'Hodan A. Ali' })
  })

  /**
   * Every university staff command calls `requireAssignableRole` on the membership's CURRENT role,
   * so a UNIVERSITY_ADMIN founder is refused with STAFF_ROLE_NOT_ASSIGNABLE. Their row therefore
   * offers no identity controls that would only produce a 403.
   */
  it('offers no identity controls on a UNIVERSITY_ADMIN founder row', async () => {
    stubFetch([staffMember({ role: 'UNIVERSITY_ADMIN', displayName: 'Founder', departmentIds: [] })])
    renderPage()

    await screen.findByText('Founder')
    expect(screen.queryByRole('button', { name: 'Change name' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign username' })).not.toBeInTheDocument()
  })

  it('shows a coordinator only the departments they are actually scoped to', async () => {
    stubFetch([staffMember({ departmentIds: [IT_DEPARTMENT.id] })])
    renderPage()

    // The scope summary names the assigned department and not the one they cannot reach. Backend
    // authorization is what actually enforces this; the row must simply report it truthfully.
    const summary = await screen.findByText(/Information Technology/)
    expect(summary.textContent).not.toContain('Medicine')
  })

  it('creates staff with a display name and never derives one from the email', async () => {
    stubFetch([])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Add staff account' }))
    await userEvent.type(screen.getByLabelText('Full name'), 'New Coordinator')
    await userEvent.type(screen.getByLabelText('Email address'), 'new@example.test')
    await userEvent.type(screen.getByLabelText('Username'), 'new.coordinator')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.click(screen.getByLabelText(IT_DEPARTMENT.name))
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    const created = await waitFor(() => {
      const call = commands.find((entry) => entry.url.endsWith('/staff'))
      expect(call).toBeDefined()
      return call!
    })
    expect(created.body).toMatchObject({
      displayName: 'New Coordinator',
      username: 'new.coordinator',
      role: 'DEPARTMENT_COORDINATOR',
      departmentIds: [IT_DEPARTMENT.id],
    })
  })

  it('omits the display name when it was left blank', async () => {
    stubFetch([])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Add staff account' }))
    await userEvent.type(screen.getByLabelText('Email address'), 'new@example.test')
    await userEvent.type(screen.getByLabelText('Username'), 'new.coordinator')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.click(screen.getByLabelText(IT_DEPARTMENT.name))
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    const created = await waitFor(() => {
      const call = commands.find((entry) => entry.url.endsWith('/staff'))
      expect(call).toBeDefined()
      return call!
    })
    expect(created.body).not.toHaveProperty('displayName')
  })

  it('offers only the two assignable university staff roles', async () => {
    stubFetch([])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Add staff account' }))
    const select = document.getElementById('staff-role') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'DEPARTMENT_COORDINATOR',
      'UNIVERSITY_SUPERVISOR',
    ])
  })
})
