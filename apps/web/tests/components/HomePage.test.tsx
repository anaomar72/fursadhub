import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '../../src/app/pages/HomePage'
import i18n from '../../src/lib/i18n'

const emptyPage = { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 }

function renderPage(page: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('approved public home page', () => {
  beforeEach(() => {
    // The home page reads the three public directories. Everything it renders comes from these
    // responses — the page must never fall back to the mockups' illustrative examples.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(emptyPage), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ),
      ),
    )
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await act(() => i18n.changeLanguage('en'))
  })

  it('uses supported public and registration routes', async () => {
    renderPage(<HomePage />)

    expect(await screen.findByRole('link', { name: 'View all internships' })).toHaveAttribute('href', '/opportunities')
    expect(screen.getByRole('link', { name: 'Get started as a student' })).toHaveAttribute('href', '/register?role=student')
    expect(screen.getByRole('heading', { name: 'How FursadHub Works' })).toBeInTheDocument()
  })

  it('renders the approved hero headline and search form', async () => {
    renderPage(<HomePage />)

    expect(screen.getByRole('heading', { name: /Find Internships\./ })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search internships, skills, or organizations')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('renders the complete hero and ecosystem in Somali', async () => {
    await act(() => i18n.changeLanguage('so'))
    renderPage(<HomePage />)

    expect(screen.getByRole('heading', { name: /Hel Tababaro\./ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sida FursadHub u Shaqayso' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Dhammaan tababarada eeg' })).toHaveAttribute('href', '/opportunities')
  })
})
