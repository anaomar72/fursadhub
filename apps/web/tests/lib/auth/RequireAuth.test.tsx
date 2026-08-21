import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { RequireAuth } from '../../../src/lib/auth/RequireAuth'

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    )
  })

  it('redirects an unauthenticated visitor to /login once the silent refresh attempt resolves', async () => {
    render(
      <MemoryRouter initialEntries={['/student']}>
        <AppProviders>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route
              path="/student"
              element={
                <RequireAuth>
                  <div>Student area</div>
                </RequireAuth>
              }
            />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Student area')).not.toBeInTheDocument()
  })
})
