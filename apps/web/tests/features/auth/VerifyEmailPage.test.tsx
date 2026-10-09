import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { VerifyEmailPage } from '../../../src/features/auth/pages/VerifyEmailPage'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let verifyCallCount = 0
let verifyBodies: { email: string; code: string }[] = []
let resendCallCount = 0
let verifyBehavior: 'success' | 'wrong-code' | 'locked' | 'expired' | 'network' = 'success'

/** The address bar and the history entry's state, as the page left them. */
function LocationProbe() {
  const location = useLocation()
  return (
    <output
      data-testid="location"
      data-search={location.search}
      data-state-email={(location.state as { email?: string } | null)?.email ?? ''}
    />
  )
}

/** The page as RegisterPage now opens it: the email in navigation state, never in the URL. */
const FROM_REGISTRATION: InitialEntry = { pathname: '/verify-email', search: '?role=student&registered=1', state: { email: 'student@example.com' } }

function renderVerifyEmailPage(initialEntry: InitialEntry = FROM_REGISTRATION, { strict = false } = {}) {
  const tree = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <Routes>
          <Route
            path="/verify-email"
            element={
              <>
                <VerifyEmailPage />
                <LocationProbe />
              </>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

const codeBoxes = () => screen.getAllByLabelText(/verification code —/i) as HTMLInputElement[]
const codeValue = () => codeBoxes().map((box) => box.value).join('')

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    verifyCallCount = 0
    verifyBodies = []
    resendCallCount = 0
    verifyBehavior = 'success'

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) {
          return jsonResponse(
            { code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] },
            401,
          )
        }
        if (url.includes('/auth/email/verify')) {
          verifyCallCount++
          verifyBodies.push(JSON.parse(String(init?.body)))
          if (verifyBehavior === 'network') {
            return Promise.reject(new TypeError('Failed to fetch'))
          }
          if (verifyBehavior === 'success') {
            return jsonResponse({ message: 'Your email address has been verified.' }, 200)
          }
          if (verifyBehavior === 'expired') {
            return jsonResponse(
              {
                code: 'EMAIL_VERIFICATION_CODE_EXPIRED',
                message: '',
                status: 400,
                path: '',
                timestamp: '',
                fieldErrors: [],
              },
              400,
            )
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
          resendCallCount++
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

    // A wrong code stays on the form, because retyping is the fix. The copy names the other thing
    // this response can mean — an address that is already verified has no active challenge, so the
    // server answers a correct-looking attempt with exactly this code and the UI must not guess.
    expect(await screen.findByRole('alert')).toHaveTextContent(/not right, or it has already been used/i)
    expect(screen.getAllByLabelText(/verification code —/i).length).toBeGreaterThan(0)
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

    // Auto-submit fired. The page is now on its own branded waiting state, which is what removes
    // the possibility of a second submission: there is no code field and no Verify button to
    // press while the first request is still in flight.
    expect(await screen.findByRole('heading', { name: /verifying your email/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^verify$/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/verification code —/i)).not.toBeInTheDocument()

    resolvePendingVerify?.()
    await screen.findByRole('heading', { name: /email verified successfully/i })

    expect(verifyCallCount).toBe(1)
  })

  it('never spends a second server attempt on a code the user has not changed', async () => {
    verifyBehavior = 'wrong-code'
    const user = userEvent.setup()
    renderVerifyEmailPage()

    await user.type(screen.getAllByLabelText(/verification code —/i)[0], '0000')
    await screen.findByRole('alert')

    // The field auto-submits whenever it is full, which used to re-fire after the rejection and
    // burn a second of the server's five attempts on input nobody retyped.
    expect(verifyCallCount).toBe(1)
  })

  it('ends the attempt with a recoverable screen when max attempts are exceeded', async () => {
    verifyBehavior = 'locked'
    const user = userEvent.setup()
    renderVerifyEmailPage()

    const boxes = screen.getAllByLabelText(/verification code —/i)
    await user.type(boxes[0], '0000')

    // A locked challenge cannot be retyped into working, so the form is replaced rather than
    // annotated: the screen says what happened and offers the one control that fixes it.
    expect(await screen.findByRole('heading', { name: /too many incorrect attempts/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^verify$/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/verification code —/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument()
  })

  it('ends the attempt with a recoverable screen when the code has expired', async () => {
    verifyBehavior = 'expired'
    const user = userEvent.setup()
    renderVerifyEmailPage()

    await user.type(screen.getAllByLabelText(/verification code —/i)[0], '0000')

    expect(await screen.findByRole('heading', { name: /this code has expired/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument()
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
    // Adopted into navigation state — not written back into the address bar. The router applies a
    // navigation as a transition, so it can commit after the heading's plain state update; waiting
    // for that one commit is what made this assertion stop depending on machine load.
    await waitFor(() => expect(screen.getByTestId('location')).toHaveAttribute('data-state-email', 'newcomer@example.com'))
    expect(screen.getByTestId('location').getAttribute('data-search')).not.toMatch(/email=/)
  })

  describe('recovering from a rejected code', () => {
    it('clears the boxes and puts focus back on the first one', async () => {
      verifyBehavior = 'wrong-code'
      const user = userEvent.setup()
      renderVerifyEmailPage()

      await user.type(codeBoxes()[0], '1111')
      expect(await screen.findByRole('alert')).toHaveTextContent(/not right/i)

      expect(codeValue()).toBe('')
      await waitFor(() => expect(codeBoxes()[0]).toHaveFocus())
    })

    it('does not submit on the first digit of the next code, then submits the complete fresh code exactly once', async () => {
      verifyBehavior = 'wrong-code'
      const user = userEvent.setup()
      renderVerifyEmailPage()

      await user.type(codeBoxes()[0], '1111')
      await screen.findByRole('alert')
      expect(verifyCallCount).toBe(1)

      verifyBehavior = 'success'
      await user.keyboard('2')
      // Previously the stale digits made "2111" a complete code and it was sent at once.
      expect(codeValue()).toBe('2')
      expect(verifyCallCount).toBe(1)
      // Typing clears the previous error: the person is working on a new answer.
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      await user.keyboard('940')
      expect(await screen.findByRole('heading', { name: /email verified successfully/i })).toBeInTheDocument()
      expect(verifyCallCount).toBe(2)
      expect(verifyBodies[1]).toEqual({ email: 'student@example.com', code: '2940' })
    })

    it('shows the same error again, without spending an attempt, when a rejected code is retyped', async () => {
      verifyBehavior = 'wrong-code'
      const user = userEvent.setup()
      renderVerifyEmailPage()

      await user.type(codeBoxes()[0], '1111')
      await screen.findByRole('alert')
      await user.keyboard('1111')

      expect(await screen.findByRole('alert')).toHaveTextContent(/not right/i)
      expect(verifyCallCount).toBe(1)
      expect(codeValue()).toBe('')
    })

    it('lets the same code be retried after a dropped connection, which is not a rejection', async () => {
      verifyBehavior = 'network'
      const user = userEvent.setup()
      renderVerifyEmailPage()

      await user.type(codeBoxes()[0], '2940')
      await screen.findByRole('alert')
      expect(codeValue()).toBe('')

      verifyBehavior = 'success'
      await user.keyboard('2940')
      expect(await screen.findByRole('heading', { name: /email verified successfully/i })).toBeInTheDocument()
      expect(verifyCallCount).toBe(2)
    })
  })

  it('submits exactly once under StrictMode double rendering', async () => {
    const user = userEvent.setup()
    renderVerifyEmailPage(FROM_REGISTRATION, { strict: true })

    await user.type(codeBoxes()[0], '2940')
    expect(await screen.findByRole('heading', { name: /email verified successfully/i })).toBeInTheDocument()
    expect(verifyCallCount).toBe(1)
  })

  it('submits a pasted complete code exactly once', async () => {
    const user = userEvent.setup()
    renderVerifyEmailPage()

    await user.click(codeBoxes()[0])
    await user.paste('2940')

    expect(await screen.findByRole('heading', { name: /email verified successfully/i })).toBeInTheDocument()
    expect(verifyCallCount).toBe(1)
    expect(verifyBodies[0].code).toBe('2940')
  })

  describe('resend', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('clears stale digits and treats the new challenge as fresh — a previously rejected code may be tried again', async () => {
      verifyBehavior = 'wrong-code'
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderVerifyEmailPage()

      await user.type(codeBoxes()[0], '1111')
      await screen.findByRole('alert')

      vi.advanceTimersByTime(61_000)
      await user.click(await screen.findByRole('button', { name: /resend code/i }))
      await waitFor(() => expect(resendCallCount).toBe(1))
      // The server supersedes the old code when it issues a new one.
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
      expect(codeValue()).toBe('')

      await user.type(codeBoxes()[0], '1111')
      await waitFor(() => expect(verifyCallCount).toBe(2))
    })
  })

  describe('the email address never sits in the URL', () => {
    it('reads it from navigation state — which is what a refresh or back/forward restores', async () => {
      renderVerifyEmailPage({ pathname: '/verify-email', search: '?role=organization', state: { email: 'founder@example.com' } })

      expect(screen.getByText(/founder@example\.com/)).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /enter your email to continue/i })).not.toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveAttribute('data-search', '?role=organization')
      expect(screen.getByTestId('location')).toHaveAttribute('data-state-email', 'founder@example.com')
    })

    it('still accepts an older ?email= link but removes the address from the URL on arrival', async () => {
      const user = userEvent.setup()
      renderVerifyEmailPage('/verify-email?email=legacy%40example.com&role=student&registered=1')

      await waitFor(() => expect(screen.getByTestId('location')).toHaveAttribute('data-search', '?role=student&registered=1'))
      expect(screen.getByTestId('location')).toHaveAttribute('data-state-email', 'legacy@example.com')
      expect(screen.getByText(/legacy@example\.com/)).toBeInTheDocument()

      await user.type(codeBoxes()[0], '2940')
      await screen.findByRole('heading', { name: /email verified successfully/i })
      expect(verifyBodies[0]).toEqual({ email: 'legacy@example.com', code: '2940' })
    })
  })
})
