import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { LoginPage } from '../../../src/features/auth/pages/LoginPage'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(body === null ? 'null' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AppProviders>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<div>Register page</div>} />
          <Route path="/forgot-password" element={<div>Forgot password page</div>} />
          <Route path="/student" element={<div>Student console</div>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('signs in successfully and lands on the resolved console', async () => {
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
        if (url.includes('/auth/login')) {
          return jsonResponse({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 600 }, 200)
        }
        if (url.includes('/admin/me')) return jsonResponse({ platformAdmin: false, roles: [] }, 200)
        if (url.includes('/organization-memberships/me')) return jsonResponse([], 200)
        if (url.includes('/university-memberships/me')) return jsonResponse(null, 200)
        return jsonResponse({}, 200)
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email address/i), 'student@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /^login$/i }))

    expect(await screen.findByText('Student console')).toBeInTheDocument()
  })

  it('shows a translated error and does not navigate on invalid credentials', async () => {
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
        if (url.includes('/auth/login')) {
          return jsonResponse(
            { code: 'INVALID_CREDENTIALS', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] },
            401,
          )
        }
        return jsonResponse({}, 200)
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email address/i), 'student@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /^login$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect email or password/i)
    expect(screen.queryByText('Student console')).not.toBeInTheDocument()
  })

  it('remembers the email locally only when "remember me" is checked', async () => {
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
        if (url.includes('/auth/login')) {
          return jsonResponse({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 600 }, 200)
        }
        return jsonResponse(url.includes('/organization-memberships/me') ? [] : null, 200)
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email address/i), 'remembered@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'Password123')
    await user.click(screen.getByLabelText(/remember me/i))
    await user.click(screen.getByRole('button', { name: /^login$/i }))

    await screen.findByText('Student console')
    expect(window.localStorage.getItem('fursadhub-remembered-email')).toBe('remembered@example.com')
  })

  it('toggles password visibility', async () => {
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
        return jsonResponse({}, 200)
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()

    const passwordField = screen.getByLabelText(/^password$/i) as HTMLInputElement
    expect(passwordField).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(passwordField).toHaveAttribute('type', 'text')
  })
})
