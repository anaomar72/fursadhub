import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { StaffPage } from '../../../src/features/university/pages/StaffPage'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { DepartmentResponse, StaffMemberResponse } from '../../../src/features/university/types'

const UNIVERSITY_ID = 'univ-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function department(overrides: Partial<DepartmentResponse> = {}): DepartmentResponse {
  return { id: 'dept-1', universityId: UNIVERSITY_ID, name: 'Computer Science', code: 'CS', ...overrides }
}

function staffMember(overrides: Partial<StaffMemberResponse> = {}): StaffMemberResponse {
  return {
    membershipId: 'member-1',
    userId: 'user-1',
    email: 'coordinator@example.test',
    role: 'DEPARTMENT_COORDINATOR',
    status: 'ACTIVE',
    departmentIds: ['dept-1'],
    assignedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(
  staff: StaffMemberResponse[] = [staffMember()],
  departments: DepartmentResponse[] = [department()],
  onCommand?: (url: string, init?: RequestInit) => Promise<Response>,
) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url, init) : jsonResponse({ message: 'ok' })
    }
    if (url.includes('/departments')) {
      return jsonResponse(departments)
    }
    if (url.includes('/staff')) {
      return jsonResponse(staff)
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
        <UniversityMembershipContext.Provider value={{ universityId: UNIVERSITY_ID, role: 'UNIVERSITY_ADMIN', departmentIds: [] }}>
          <StaffPage />
        </UniversityMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('StaffPage (university)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('offers only the assignable roles, never University Admin', async () => {
    stubFetch()
    renderPage()

    const select = (await screen.findByLabelText('Role')) as HTMLSelectElement
    const optionValues = Array.from(select.options).map((option) => option.value)
    expect(optionValues).toEqual(['DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR'])
  })

  it('requires at least one department before submitting', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.type(await screen.findByLabelText('Email address'), 'new-coordinator@example.test')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByText('Select at least one department.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/staff') && (init as RequestInit)?.method === 'POST')).toBe(false)
  })

  it('blocks submission when password and confirmation differ', async () => {
    stubFetch()
    renderPage()

    await userEvent.type(await screen.findByLabelText('Email address'), 'new-coordinator@example.test')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password124')
    await userEvent.selectOptions(screen.getByLabelText('Departments'), ['dept-1'])
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('creates a staff account and clears the password fields', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.type(await screen.findByLabelText('Email address'), 'new-coordinator@example.test')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.selectOptions(screen.getByLabelText('Departments'), ['dept-1'])
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith('/staff') && (init as RequestInit)?.method === 'POST',
      )
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
        email: 'new-coordinator@example.test',
        password: 'Password123',
        confirmPassword: 'Password123',
        role: 'DEPARTMENT_COORDINATOR',
        departmentIds: ['dept-1'],
      })
    })
    expect((screen.getByLabelText('Temporary password') as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('shown only once', { exact: false })).not.toBeInTheDocument()
  })

  it('shows a mapped error when the email already exists', async () => {
    stubFetch([staffMember()], [department()], (url) =>
      url.endsWith('/staff')
        ? jsonResponse(
            { code: 'STAFF_EMAIL_ALREADY_EXISTS', message: 'x', status: 409, path: '/x', timestamp: 'now', fieldErrors: [] },
            409,
          )
        : jsonResponse({ message: 'ok' }),
    )
    renderPage()

    await userEvent.type(await screen.findByLabelText('Email address'), 'dup@example.test')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.selectOptions(screen.getByLabelText('Departments'), ['dept-1'])
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  })

  it('shows a status badge for each staff member', async () => {
    stubFetch([staffMember({ status: 'PENDING_CONTACT_VERIFICATION' })])
    renderPage()

    expect(await screen.findByText('Awaiting email verification')).toBeInTheDocument()
  })

  it('suspends an active member and offers reactivation once suspended', async () => {
    const fetchMock = stubFetch([staffMember({ status: 'ACTIVE' })])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/member-1/suspend'))).toBe(true)
    })
  })

  it('offers reactivation for a suspended member instead of suspend', async () => {
    stubFetch([staffMember({ status: 'SUSPENDED' })])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument()
  })

  it('reveals a one-time credential panel after resetting a password, and dismiss clears it', async () => {
    const fetchMock = stubFetch([staffMember()], [department()], (url) =>
      url.includes('/reset-password')
        ? jsonResponse({ membershipId: 'member-1', email: 'coordinator@example.test', temporaryPassword: 'TempPass123' })
        : jsonResponse({ message: 'ok' }),
    )
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('TempPass123')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/member-1/reset-password'))).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('TempPass123')

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('TempPass123')).not.toBeInTheDocument()
  })

  it('posts the new role and department scope from the inline role-change form', async () => {
    const fetchMock = stubFetch([staffMember({ role: 'DEPARTMENT_COORDINATOR', departmentIds: ['dept-1'] })], [
      department({ id: 'dept-1', name: 'Computer Science' }),
      department({ id: 'dept-2', name: 'Business' }),
    ])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Change role' }))
    const roleSelect = screen.getByLabelText('Role', { selector: '#role-member-1' })
    await userEvent.selectOptions(roleSelect, 'UNIVERSITY_SUPERVISOR')
    const departmentsSelect = screen.getByLabelText('Departments', { selector: '#departments-member-1' })
    await userEvent.deselectOptions(departmentsSelect, ['dept-1'])
    await userEvent.selectOptions(departmentsSelect, ['dept-2'])
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/member-1/role'))
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
        role: 'UNIVERSITY_SUPERVISOR',
        departmentIds: ['dept-2'],
      })
    })
  })
})
