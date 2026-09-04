import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { PublicHeader } from '../../src/app/layouts/PublicHeader'
import { PublicFooter } from '../../src/app/layouts/PublicFooter'
import { ThemeProvider } from '../../src/lib/theme/ThemeProvider'
import i18n from '../../src/lib/i18n'

function renderHeader(route='/') { return render(<MemoryRouter initialEntries={[route]}><ThemeProvider><PublicHeader/></ThemeProvider></MemoryRouter>) }

describe('public shell',()=>{
  afterEach(async()=>{await i18n.changeLanguage('en');window.localStorage.clear()})

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
    await user.click(screen.getAllByRole('button',{name:'Use dark theme'})[0])
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('renders only working footer routes',()=>{
    render(<MemoryRouter><PublicFooter/></MemoryRouter>)
    expect(screen.getByRole('link',{name:'Terms and Conditions'})).toHaveAttribute('href','/legal/terms')
  })
})
