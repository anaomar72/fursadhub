import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Menu } from '../../src/components/ui/Menu'

function renderMenu(onProfile = vi.fn()) {
  render(
    <>
      <Menu
        trigger={<span>Me</span>}
        triggerLabel="Account"
        items={[
          { label: 'Profile', onSelect: onProfile },
          { label: 'Settings', onSelect: vi.fn() },
          { label: 'Sign out', onSelect: vi.fn(), danger: true },
        ]}
      />
      <button type="button">After</button>
    </>,
  )
  return screen.getByRole('button', { name: 'Account' })
}

/** The menu role promises the WAI-ARIA menu-button keyboard pattern; this is that promise. */
describe('Menu keyboard pattern', () => {
  it('moves focus into the menu when opened from the keyboard, and arrows wrap', async () => {
    const user = userEvent.setup()
    const trigger = renderMenu()
    trigger.focus()

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
  })

  it('opens on ArrowUp at the last item', async () => {
    const user = userEvent.setup()
    const trigger = renderMenu()
    trigger.focus()

    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
  })

  it('closes on Escape and gives focus back to the trigger', async () => {
    const user = userEvent.setup()
    const trigger = renderMenu()
    trigger.focus()

    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('selects with Enter, and closes when Tab leaves', async () => {
    const user = userEvent.setup()
    const onProfile = vi.fn()
    const trigger = renderMenu(onProfile)
    trigger.focus()

    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
    expect(onProfile).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    trigger.focus()
    await user.keyboard('{ArrowDown}')
    await user.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('keeps focus on the trigger when opened with a pointer', async () => {
    const user = userEvent.setup()
    const trigger = renderMenu()

    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(trigger).toHaveFocus()
    // Items are reached with the arrows, not as extra Tab stops.
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute('tabindex', '-1')
  })
})
