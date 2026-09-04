import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { ResetPasswordPage } from '../../../src/features/auth/pages/ResetPasswordPage'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let resetBehavior: 'success' | 'expired' = 'success'

function renderResetPasswordPage(initialPath = '/reset-password?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppProviders>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/forgot-password" element={<div>Forgot password page</div>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    resetBehavior = 'success'
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
        if (url.includes('/auth/password/reset')) {
          if (resetBehavior === 'expired') {
            return jsonResponse(
              { code: 'PASSWORD_RESET_TOKEN_EXPIRED', message: '', status: 400, path: '', timestamp: '', fieldErrors: [] },
              400,
            )
          }
          return jsonResponse({ message: 'ok' }, 200)
        }
        return jsonResponse({}, 200)
      }),
    )
  })

  it('shows a missing-token message when the link has no token', () => {
    renderResetPasswordPage('/reset-password')
    expect(screen.getByText(/missing its token/i)).toBeInTheDocument()
  })

  it('rejects a mismatched confirmation password', async () => {
    const user = userEvent.setup()
    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Different123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByText(/passwords.*match|match.*password/i)).toBeInTheDocument()
  })

  it('resets successfully and shows the one-time verified confirmation', async () => {
    const user = userEvent.setup()
    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByRole('heading', { name: /password updated/i })).toBeInTheDocument()
  })

  it('shows a translated error for an expired reset link and does not enter the success state', async () => {
    resetBehavior = 'expired'
    const user = userEvent.setup()
    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/i)
    expect(screen.queryByRole('heading', { name: /password updated/i })).not.toBeInTheDocument()
  })
})
