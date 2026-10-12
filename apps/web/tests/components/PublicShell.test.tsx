import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicHeader } from '../../src/app/layouts/PublicHeader'
import { PublicFooter } from '../../src/app/layouts/PublicFooter'
import { ThemeProvider } from '../../src/lib/theme/ThemeProvider'
import i18n from '../../src/lib/i18n'
import { useAuth } from '../../src/lib/auth/AuthContext'
vi.mock('../../src/lib/auth/AuthContext', () => ({ useAuth: vi.fn() }))

function renderHeader(route='/') { return render(<MemoryRouter initialEntries={[route]}><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><ThemeProvider><PublicHeader/></ThemeProvider></QueryClientProvider></MemoryRouter>) }

describe('public shell',()=>{
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, isInitializing: false, accessToken: null, signIn: vi.fn(), signOut: vi.fn() })
  })
  afterEach(async()=>{await i18n.changeLanguage('en');window.localStorage.clear();vi.unstubAllGlobals()})

  /**
   * The signed-in header reads real identity: `/me` plus the three membership probes that decide
   * which workspace the account belongs to. This answers them the way the server would for a
   * student — an account with no staff membership anywhere.
   */
  function stubSignedInStudent() {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, isInitializing: false, accessToken: 'test', signIn: vi.fn(), signOut: vi.fn() })
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const json = (body: unknown, status = 200) =>
        Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
      if (url.includes('/me') && !url.includes('memberships')) {
        return json({ id: 'u-1', email: 'amina@fursadhub.test', status: 'ACTIVE', preferredLocale: 'en', emailVerifiedAt: null, hasAvatar: false })
      }
      if (url.includes('/organization-memberships/me')) return json([])
      if (url.includes('/university-memberships/me')) return json({}, 404)
      if (url.includes('/admin/session')) return json({ platformAdmin: false, roles: [] })
      return json({})
    }))
  }

  it('marks the current working public route active',()=>{
    renderHeader('/opportunities')
    expect(screen.getAllByRole('link',{name:'Internships'})[0]).toHaveAttribute('aria-current','page')
    expect(screen.getByRole('link',{name:'Login'})).toHaveAttribute('href','/login')
    expect(screen.getByRole('link',{name:'Get Started'})).toHaveAttribute('href','/register')
  })

  it('opens the mobile navigation and closes it with Escape',async()=>{
    const user=userEvent.setup();renderHeader()
    const trigger=screen.getByRole('button',{name:'Open menu'})
    await user.click(trigger)
    expect(screen.getByRole('dialog',{name:'Public navigation'})).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog',{name:'Public navigation'})).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('switches language and theme through existing providers',async()=>{
    const user=userEvent.setup();renderHeader()
    await user.click(screen.getAllByRole('button',{name:'Switch to Somali'})[0])
    expect(await screen.findByText('Tababarro')).toBeInTheDocument()
    // The theme control is translated too (CLAUDE.md section 56), so once the shell is in Somali
    // its accessible name is the Somali one. Asserting that here is what proves the label is not
    // a hardcoded English string.
    await user.click(screen.getAllByRole('button',{name:'Adeegso muuqaalka madow'})[0])
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getAllByRole('button',{name:'Adeegso muuqaalka iftiinka'})[0]).toBeInTheDocument()
  })

  it('renders only working footer routes',()=>{
    render(<MemoryRouter><PublicFooter/></MemoryRouter>)
    expect(screen.getByRole('link',{name:'Terms and Conditions'})).toHaveAttribute('href','/legal/terms')
  })

  it('links the footer privacy item to the public privacy policy, never to signed-in account pages', async () => {
    render(<MemoryRouter><PublicFooter/></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Privacy and data' })).toHaveAttribute('href', '/legal/privacy-policy')
    // No public footer link may lead behind sign-in.
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^\/(account|student|organization|university|admin)(\/|$)/)
    }

    await i18n.changeLanguage('so')
    expect(await screen.findByRole('link', { name: 'Asturnaanta iyo xogta' })).toHaveAttribute('href', '/legal/privacy-policy')
  })

  it('groups the footer into named navigation and keeps every line at or above the 12px floor', () => {
    const { container } = render(<MemoryRouter><PublicFooter/></MemoryRouter>)
    expect(screen.getByRole('navigation', { name: 'Platform' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Support' })).toBeInTheDocument()
    const legal = screen.getByRole('navigation', { name: 'Legal' })
    expect(within(legal).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/legal/privacy-policy')
    expect(container.innerHTML).not.toMatch(/text-\[1[01]px\]|text-\[0\.6875rem\]/)
  })

  /*
   * A signed-in visitor gets identity, not a call to action. The header used to hand them a large
   * navy "My portal" button — the loudest control in the bar, aimed at someone who is already a
   * customer, and silent about which account they were signed in as.
   */
  it('gives a signed-in visitor an account menu instead of a portal call to action', async () => {
    stubSignedInStudent()
    renderHeader('/opportunities')

    expect(screen.getByRole('link', { name: 'Internships' })).toHaveAttribute('aria-current', 'page')
    // The anonymous calls to action are gone...
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument()
    // ...and so is the generic portal CTA, in every language it was ever rendered in.
    expect(screen.queryByRole('button', { name: /my portal/i })).not.toBeInTheDocument()

    // The account trigger appears once the signed-in identity resolves.
    expect(await screen.findByRole('button', { name: 'Account' })).toBeInTheDocument()
  })

  it('opens the account menu and offers only existing destinations', async () => {
    stubSignedInStudent()
    const user = userEvent.setup()
    renderHeader('/opportunities')

    await user.click(await screen.findByRole('button', { name: 'Account' }))
    const menu = screen.getByRole('menu', { name: 'Account' })
    expect(within(menu).getByRole('menuitem', { name: 'Go to my workspace' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Account settings' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: 'Account' })).not.toBeInTheDocument()
  })

  it('highlights the directory while reading an entity profile', () => {
    renderHeader('/organizations/live-entity')
    expect(screen.getByRole('link', { name: 'Organizations' })).toHaveAttribute('aria-current', 'page')
  })
})
