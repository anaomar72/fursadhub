import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { ForgotPasswordPage } from '../../../src/features/auth/pages/ForgotPasswordPage'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function renderForgotPasswordPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <AppProviders>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('ForgotPasswordPage', () => {
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
        if (url.includes('/auth/password/forgot')) {
          return jsonResponse({ message: 'ok' }, 200)
        }
        return jsonResponse({}, 200)
      }),
    )
  })

  it('shows a validation error for an invalid email and does not submit', async () => {
    const user = userEvent.setup()
    renderForgotPasswordPage()

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
  })

  it('shows the check-your-email success state, without leaking account existence', async () => {
    const user = userEvent.setup()
    renderForgotPasswordPage()

    await user.type(screen.getByLabelText(/email address/i), 'student@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    expect(screen.getByText(/if an account exists for this email/i)).toBeInTheDocument()
  })

  it('links back to login', async () => {
    const user = userEvent.setup()
    renderForgotPasswordPage()

    await user.click(screen.getByRole('link', { name: /login/i }))
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })
})
