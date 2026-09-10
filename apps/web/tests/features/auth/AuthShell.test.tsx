import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AuthLayout } from '../../../src/app/layouts/AuthLayout'
import { AuthBrandPanel } from '../../../src/features/auth/components/AuthShell'
import { panelKeyForPath } from '../../../src/features/auth/authPanels'
import i18n from '../../../src/lib/i18n'

function renderAt(path: string, children: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path={path} element={children} />
          </Route>
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AuthShell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('maps each auth route to its own panel, and falls back rather than throwing', () => {
    expect(panelKeyForPath('/login')).toBe('login')
    expect(panelKeyForPath('/register')).toBe('register')
    expect(panelKeyForPath('/verify-email')).toBe('verifyEmail')
    expect(panelKeyForPath('/forgot-password')).toBe('forgotPassword')
    expect(panelKeyForPath('/reset-password')).toBe('resetPassword')
    // Query strings and trailing slashes are routine on these routes (`?token=`, `?email=`).
    expect(panelKeyForPath('/reset-password/')).toBe('resetPassword')
    expect(panelKeyForPath('/somewhere-else')).toBe('login')
  })

  it('gives each screen its own branded copy rather than one repeated paragraph', () => {
    const login = render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthBrandPanel />
      </MemoryRouter>,
    )
    const loginHeading = login.getByRole('heading').textContent
    login.unmount()

    const register = render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthBrandPanel />
      </MemoryRouter>,
    )
    const registerHeading = register.getByRole('heading').textContent

    expect(loginHeading).toBeTruthy()
    expect(registerHeading).toBeTruthy()
    expect(loginHeading).not.toEqual(registerHeading)
  })

  it('keeps Back to Home and the legal links reachable from an auth screen', () => {
    renderAt('/login', <p>form</p>)
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: /terms and conditions/i })).toHaveAttribute('href', '/legal/terms')
    expect(within(footer).getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/legal/privacy-policy')
  })

  it('renders no raw translation keys on the branded panel', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <AuthBrandPanel />
      </MemoryRouter>,
    )
    expect(container.textContent).not.toMatch(/authPresentation\./)
    expect(container.textContent).not.toMatch(/common:/)
  })
})
