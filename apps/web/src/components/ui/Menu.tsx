import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

export interface MenuProps {
  /** The trigger's content — an `<Avatar>`, an icon, whatever should open the menu on click. */
  trigger: ReactNode
  /** Accessible name for the trigger button, since its content is often icon-only. */
  triggerLabel: string
  items: MenuItem[]
  align?: 'start' | 'end'
  className?: string
}

/**
 * Small popover menu — the account control in `Topbar` today, generic enough to reuse elsewhere
 * (CLAUDE.md section 57 lists Dropdown as a shared primitive). Deliberately minimal:
 * no submenus, no portal — a fixed-position panel under the trigger closes on outside click, on
 * Escape, or after an item is chosen.
 */
export function Menu({ trigger, triggerLabel, items, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  // Where focus goes once the panel exists: opened from the keyboard it moves into the menu, as the
  // menu role promises; opened with a pointer it stays on the trigger.
  const initialFocus = useRef<'first' | 'last' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const hadFocus = !!rootRef.current?.contains(document.activeElement)
        setOpen(false)
        if (hadFocus) triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || !initialFocus.current) return
    const list = itemRefs.current.filter(Boolean)
    const target = initialFocus.current === 'first' ? list[0] : list[list.length - 1]
    initialFocus.current = null
    target?.focus()
  }, [open])

  function openWith(focus: 'first' | 'last' | null) {
    initialFocus.current = focus
    setOpen(true)
  }

  // Menu keyboard pattern (WAI-ARIA menu button): arrows move between items and wrap, Home/End jump,
  // Tab leaves and closes. Items are not Tab stops themselves.
  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((item) => item === document.activeElement)
    const last = items.length - 1
    const move = (index: number) => {
      event.preventDefault()
      itemRefs.current[index]?.focus()
    }
    if (event.key === 'ArrowDown') move(current >= last ? 0 : current + 1)
    else if (event.key === 'ArrowUp') move(current <= 0 ? last : current - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(last)
    else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={(event) => {
          if (open) setOpen(false)
          // detail 0: activated by Enter/Space rather than a pointer.
          else openWith(event.detail === 0 ? 'first' : null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openWith(event.key === 'ArrowDown' ? 'first' : 'last')
          }
        }}
        className="rounded-full transition-shadow duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'animate-menu-in motion-reduce:animate-none absolute z-20 mt-2 w-48 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => {
                itemRefs.current[index] = element
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm transition-colors duration-150 ease-in-out hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring',
                item.danger ? 'text-danger' : 'text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
