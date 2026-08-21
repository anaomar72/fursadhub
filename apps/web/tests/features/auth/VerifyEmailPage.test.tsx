import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { VerifyEmailPage } from '../../../src/features/auth/pages/VerifyEmailPage'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let verifyCallCount = 0
let verifyBehavior: 'success' | 'wrong-code' | 'locked' = 'success'

function renderVerifyEmailPage(initialPath = '/verify-email?email=student%40example.com') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppProviders>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    verifyCallCount = 0
    verifyBehavior = 'success'

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
        if (url.includes('/auth/email/verify')) {
          verifyCallCount++
          if (verifyBehavior === 'success') {
            return jsonResponse({ message: 'Your email address has been verified.' }, 200)
          }
          if (verifyBehavior === 'locked') {
            return jsonResponse(
              {
                code: 'EMAIL_VERIFICATION_CODE_LOCKED',
                message: '',
                status: 429,
                path: '',
                timestamp: '',
                fieldErrors: [],
              },
              429,
            )
          }
          return jsonResponse(
            { code: 'EMAIL_VERIFICATION_CODE_INVALID', message: '', status: 400, path: '', timestamp: '', fieldErrors: [] },
            400,
          )
        }
        if (url.includes('/auth/email/resend')) {
          return jsonResponse({ message: 'ok' }, 200)
        }
        return jsonResponse({}, 200)
      }),
    )
  })

  it('auto-submits as soon as the 4th digit is entered', async () => {
    const user = userEvent.setup()
    renderVerifyEmailPage()

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], '1234')

    expect(await screen.findByRole('heading', { name: /email verified successfully/i })).toBeInTheDocument()
    expect(verifyCallCount).toBe(1)
  })

  it('shows an inline error for a wrong code and does not enter the success state', async () => {
    verifyBehavior = 'wrong-code'
    const user = userEvent.setup()
    renderVerifyEmailPage()

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], '0000')

    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't right/i)
    expect(screen.queryByRole('heading', { name: /email verified successfully/i })).not.toBeInTheDocument()
  })

  it('does not send a second request while a verification request is still in flight', async () => {
    let resolvePendingVerify: (() => void) | null = null
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
        if (url.includes('/auth/email/verify')) {
          verifyCallCount++
          return new Promise((resolve) => {
            resolvePendingVerify = () =>
              resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
          })
        }
        return jsonResponse({}, 200)
      }),
    )

    const user = userEvent.setup()
    renderVerifyEmailPage()

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], '1234')

    // Auto-submit fired and the request is still pending — the button must be disabled so a
    // second click (whether from the user or a stray auto-submit re-trigger) cannot fire again.
    const verifyButton = await screen.findByRole('button', { name: /^verify$/i })
    expect(verifyButton).toBeDisabled()
    await user.click(verifyButton)

    resolvePendingVerify?.()
    await screen.findByRole('heading', { name: /email verified successfully/i })

    expect(verifyCallCount).toBe(1)
  })

  it('shows the locked message and disables further submission when max attempts are exceeded', async () => {
    verifyBehavior = 'locked'
    const user = userEvent.setup()
    renderVerifyEmailPage()

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], '0000')

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many incorrect attempts/i)
    expect(screen.getByRole('button', { name: /^verify$/i })).toBeDisabled()
  })

  it('starts the resend cooldown immediately, since a code was just sent on arrival', async () => {
    renderVerifyEmailPage()

    expect(await screen.findByText(/resend in \d+s/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resend code/i })).not.toBeInTheDocument()
  })

  it('shows a request-code form when no email is known and adopts the email on success', async () => {
    const user = userEvent.setup()
    renderVerifyEmailPage('/verify-email')

    expect(screen.getByRole('heading', { name: /enter your email to continue/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/email address/i), 'newcomer@example.com')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
    expect(screen.getByText(/newcomer@example\.com/)).toBeInTheDocument()
  })
})
