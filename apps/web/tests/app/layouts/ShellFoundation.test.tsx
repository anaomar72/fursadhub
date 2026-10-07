import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageToggle } from '../../../src/components/ui'
import { Sidebar } from '../../../src/app/layouts/Sidebar'
import type { NavSection } from '../../../src/app/layouts/navigation'
import i18n from '../../../src/lib/i18n'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

// Real Somali destinations, at their real length — the strings the 264px rail used to cut off.
const sections: NavSection[] = [
  {
    items: [
      { to: '/university/dashboard', label: 'Guddiga', icon: 'home' },
      { to: '/university/opportunity-requests', label: 'Codsiyada magacaabista', icon: 'clipboard' },
      { to: '/university/verification-cases', label: 'Xaqiijinta diiwaangelinta ardayda', icon: 'shield' },
    ],
  },
]

function renderSidebar(collapsed = false) {
  return render(
    <MemoryRouter initialEntries={['/university/dashboard']}>
      <Sidebar sections={sections} homePath="/university/dashboard" collapsed={collapsed} onSignOut={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('application shell foundation', () => {
  it('lets a long navigation label wrap instead of truncating it to an ellipsis', () => {
    renderSidebar()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const label = within(nav).getByText('Xaqiijinta diiwaangelinta ardayda')
    expect(label).not.toHaveClass('truncate')
    expect(label).toHaveClass('break-words')
    // Fully visible, so no tooltip is needed to read it.
    expect(label.closest('a')).not.toHaveAttribute('title')
  })

  it('is an 18rem rail, not a fixed 264px one', () => {
    const { container } = renderSidebar()
    expect(container.firstElementChild).toHaveClass('w-72')
    expect(container.innerHTML).not.toMatch(/w-\[264px\]/)
  })

  it('keeps every destination named in the icon-only rail', () => {
    renderSidebar(true)
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    for (const item of sections[0].items) {
      expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
    }
  })

  it('lets the language toggle switch to Somali and straight back to English', async () => {
    const user = userEvent.setup()
    render(<LanguageToggle />)
    await user.click(screen.getByRole('button', { name: 'Switch to Somali' }))
    expect(i18n.language).toBe('so')
    // It used to stay on "EN / Switch to Somali" here, so the second click re-requested Somali.
    const back = screen.getByRole('button', { name: 'U beddel Ingiriisi' })
    expect(back).toHaveTextContent('SO')
    await user.click(back)
    expect(i18n.language).toBe('en')
    expect(screen.getByRole('button', { name: 'Switch to Somali' })).toHaveTextContent('EN')
  })

  it('never sets navigation text below the 12px caption floor', () => {
    const { container } = renderSidebar()
    expect(container.innerHTML).not.toMatch(/text-\[1[01]px\]/)
  })
})
