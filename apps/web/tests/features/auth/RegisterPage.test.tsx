import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { RegisterPage } from '../../../src/features/auth/pages/RegisterPage'
import { VerifyEmailPage } from '../../../src/features/auth/pages/VerifyEmailPage'

function VerifyEmailRoleProbe() {
  const [searchParams] = useSearchParams()
  return (
    <div>
      <span>role param: {searchParams.get('role')}</span>
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

    await user.type(screen.getByLabelText(/^email$/i), 'student@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'short')
    await user.type(screen.getByLabelText(/confirm password/i), 'short')
    await user.click(screen.getByRole('button', { name: /^register$/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('only offers the backend-supported self-registration account types, defaulting to student', async () => {
    renderRegisterPage()

    const studentOption = screen.getByRole('button', { name: /^student$/i })
    const organizationOption = screen.getByRole('button', { name: /^organization$/i })
    const universityOption = screen.getByRole('button', { name: /^university$/i })

    expect(studentOption).toHaveAttribute('aria-pressed', 'true')
    expect(organizationOption).toHaveAttribute('aria-pressed', 'false')
    expect(universityOption).toHaveAttribute('aria-pressed', 'false')

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

    await user.click(screen.getByRole('button', { name: /^organization$/i }))
    expect(screen.getByRole('button', { name: /^organization$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login?role=organization')

    await user.type(screen.getByLabelText(/^email$/i), 'org@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /^register$/i }))

    expect(await screen.findByText('role param: organization')).toBeInTheDocument()
  })
})
