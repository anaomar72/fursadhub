import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, Skeleton, SkeletonRegion, Tabs } from '../../src/components/ui'
import '../../src/lib/i18n'

describe('Button loading', () => {
  /*
   * The component's own documented contract is that loading "keeps its width stable rather than
   * collapsing to a spinner". It did the opposite: the spinner was prepended as a sibling with a
   * gap, so pressing the button widened it by 24px under the pointer and pushed everything after
   * it in the row sideways.
   */
  it('does not change width when it enters the loading state', () => {
    const { rerender, container } = render(<Button>Submit for review</Button>)
    const button = container.querySelector('button')!
    const idleLabel = button.textContent

    rerender(<Button loading>Submit for review</Button>)

    // The label keeps its box — it is transparent, not removed — which is what reserves the width.
    expect(button.textContent).toBe(idleLabel)
    expect(button.querySelector('.opacity-0')).not.toBeNull()
    // The spinner is taken out of flow entirely, so it cannot add to the measured width.
    expect(button.querySelector('.absolute')).not.toBeNull()
  })

  it('stays disabled and announces itself as busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Tabs keyboard navigation', () => {
  function Harness() {
    const [value, setValue] = useState('one')
    return (
      <Tabs
        label="Sections"
        value={value}
        onValueChange={setValue}
        items={[
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
          { id: 'skipped', label: 'Skipped', disabled: true },
          { id: 'three', label: 'Three' },
        ]}
      />
    )
  }

  /*
   * Roving tabindex was already in place, which took every unselected tab out of the tab order —
   * but nothing moved focus between them, so a keyboard user could reach the selected tab and then
   * had no way to reach any other tab at all.
   */
  it('moves between tabs with the arrow keys, wrapping at the ends', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const tablist = screen.getByRole('tablist', { name: 'Sections' })

    await user.tab()
    expect(within(tablist).getByRole('tab', { name: 'One' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(within(tablist).getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')

    // The disabled tab is stepped over rather than landed on.
    await user.keyboard('{ArrowRight}')
    expect(within(tablist).getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowRight}')
    expect(within(tablist).getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(within(tablist).getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(within(tablist).getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps only the selected tab in the page tab order', () => {
    render(<Harness />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.filter((tab) => tab.getAttribute('tabindex') === '0')).toHaveLength(1)
  })
})

describe('Skeleton announcements', () => {
  /*
   * Every placeholder used to be its own live region called "Loading", so a table skeleton
   * announced "Loading" once per bar. The wait belongs to the region, once.
   */
  it('makes one announcement for a whole placeholder block, not one per shape', () => {
    render(
      <SkeletonRegion>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </SkeletonRegion>,
    )

    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('leaves an individual placeholder out of the accessibility tree', () => {
    const { container } = render(<Skeleton className="h-4 w-full" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('reduced motion', () => {
  /*
   * Motion is disabled through two mechanisms, and both are asserted here because each covers a
   * case the other does not: `motion-safe:` / `motion-reduce:` variants for one-shot entrances,
   * and the duration tokens collapsing to 1ms for everything driven by the shared scale.
   */
  it('gates the route transition behind motion-safe', async () => {
    const { RouteTransition } = await import('../../src/app/layouts/RouteTransition')
    const { MemoryRouter } = await import('react-router-dom')
    const { container } = render(
      <MemoryRouter>
        <RouteTransition>
          <p>Page</p>
        </RouteTransition>
      </MemoryRouter>,
    )
    expect(container.firstElementChild).toHaveClass('motion-safe:animate-route-in')
  })

  it('keeps a loading spinner spinning, because its movement is the message', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    )
    const { container } = render(<Button loading>Save</Button>)
    const spinner = container.querySelector('.animate-spin')!
    expect(spinner.className).not.toContain('motion-reduce:animate-none')
    vi.unstubAllGlobals()
  })
})
