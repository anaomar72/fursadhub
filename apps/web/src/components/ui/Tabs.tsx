import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface TabItem {
  id: string
  label: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onValueChange: (id: string) => void
  label: string
  className?: string
}

/**
 * The shared tab strip.
 *
 * <p>Roving tabindex: only the selected tab is in the tab order, so Tab moves past the whole strip
 * rather than through every tab in it, and the arrow keys move between tabs. That second half was
 * missing — the roving tabindex was already set, which meant a keyboard user could reach the
 * selected tab and then had no way at all to reach any of the others. Home and End jump to the
 * ends, and disabled tabs are skipped rather than landed on.
 *
 * <p>Selection follows focus, which is the expected behaviour for tabs whose panels are already
 * loaded: arrowing to a tab shows it, with no second keystroke to confirm.
 *
 * <p>The active indicator is a border colour change rather than a sliding underline. A rule that
 * travels between tabs draws the eye to the rule; the point of the interaction is the content that
 * just changed underneath it.
 */
export function Tabs({ items, value, onValueChange, label, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  function focusTab(id: string) {
    onValueChange(id)
    // The newly selected tab is the one that becomes tabbable, so focus has to follow it or the
    // next arrow press would be read by an element that is no longer in the tab order.
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`)?.focus()
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const selectable = items.filter((item) => !item.disabled)
    if (selectable.length === 0) return

    const current = selectable.findIndex((item) => item.id === value)
    let next: number | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % selectable.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + selectable.length) % selectable.length
    } else if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = selectable.length - 1
    }

    if (next === null) return
    event.preventDefault()
    focusTab(selectable[next].id)
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn('flex max-w-full gap-1 overflow-x-auto border-b border-border', className)}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          data-tab-id={item.id}
          aria-selected={value === item.id}
          tabIndex={value === item.id ? 0 : -1}
          disabled={item.disabled}
          onClick={() => onValueChange(item.id)}
          className={cn(
            'shrink-0 border-b-2 px-3 py-2 text-sm font-semibold',
            'transition-[color,border-color] duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50 motion-reduce:transition-none',
            value === item.id
              ? 'border-brand-primary text-brand-accent-ink dark:border-info dark:text-info'
              : 'border-transparent text-muted hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
