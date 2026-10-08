import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { RegisterPage } from '../../../src/features/auth/pages/RegisterPage'
import { VerifyEmailPage } from '../../../src/features/auth/pages/VerifyEmailPage'

function VerifyEmailRoleProbe() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  return (
    <div>
      <span>role param: {searchParams.get('role')}</span>
      <output data-testid="verify-location" data-search={location.search} data-state-email={(location.state as { email?: string } | null)?.email ?? ''} />
      <VerifyEmailPage />
    </div>
  )
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function renderRegisterPage(verifyEmailElement = <VerifyEmailPage />) {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AppProviders>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={verifyEmailElement} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) {
          return jsonResponse(
            { code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] },
            401,
          )
        }
        if (url.includes('/auth/register')) {
          return jsonResponse({ email: 'student@example.com', status: 'PENDING_CONTACT_VERIFICATION' }, 201)
        }
        if (url.includes('/public/legal-documents')) {
          return jsonResponse([], 200)
        }
        return jsonResponse({}, 200)
      }),
    )
  })

  it('shows a validation error for an invalid email and does not submit', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/^email$/i), 'not-an-email')
    await user.type(screen.getByLabelText(/^password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /^register$/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
  })

  it('registers successfully and navigates to the verification screen', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/^email$/i), 'student@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /^register$/i }))

    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
    expect(screen.getByText(/student@example\.com/)).toBeInTheDocument()
  })

  it('rejects a password that does not meet the strength policy', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    // The policy is stated before anything is typed, and tied to the field for screen readers.
    const hint = screen.getByText(/at least 8 characters, including a letter and a number/i)
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('aria-describedby', expect.stringContaining(hint.id))

    await user.type(screen.getByLabelText(/^email$/i), 'student@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'short')
    await user.type(screen.getByLabelText(/confirm password/i), 'short')
    await user.click(screen.getByRole('button', { name: /^register$/i }))

    expect(await screen.findByText(/password must be at least 8 characters/i)).toHaveAttribute('role', 'alert')
  })

  it('only offers the backend-supported self-registration account types, defaulting to student', async () => {
    renderRegisterPage()

    const studentOption = screen.getByRole('radio', { name: /^student$/i })
    const organizationOption = screen.getByRole('radio', { name: /^organization$/i })
    const universityOption = screen.getByRole('radio', { name: /^university$/i })

    expect(studentOption).toBeChecked()
    expect(organizationOption).not.toBeChecked()
    expect(universityOption).not.toBeChecked()

    // No internal staff role (CLAUDE.md section 23/26A) or platform-admin role is ever offered here.
    expect(screen.queryByText(/super.?admin/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/verification officer/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/coordinator/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/supervisor/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/recruiter/i)).not.toBeInTheDocument()
  })

  it('selecting an account type carries it through to the verify-email and login links', async () => {
    const user = userEvent.setup()
    renderRegisterPage(<VerifyEmailRoleProbe />)

    await user.click(screen.getByRole('radio', { name: /^organization$/i }))
    expect(screen.getByRole('radio', { name: /^organization$/i })).toBeChecked()
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login?role=organization')

    await user.type(screen.getByLabelText(/^email$/i), 'org@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /^register$/i }))

    expect(await screen.findByText('role param: organization')).toBeInTheDocument()
  })

  it('hands the address to the verify step in navigation state, never in the URL', async () => {
    const user = userEvent.setup()
    renderRegisterPage(<VerifyEmailRoleProbe />)

    await user.type(screen.getByLabelText(/^email$/i), 'student@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /^register$/i }))

    const probe = await screen.findByTestId('verify-location')
    expect(probe.getAttribute('data-search')).not.toMatch(/email|student%40|@/)
    expect(probe).toHaveAttribute('data-state-email', 'student@example.com')
    // The verify step still knows whom it is verifying.
    expect(await screen.findByText(/student@example\.com/)).toBeInTheDocument()
  })
})
