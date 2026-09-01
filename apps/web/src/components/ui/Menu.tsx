import { useEffect, useRef, useState, type ReactNode } from 'react'
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
 * Small popover menu — the account control in `RoleShell` today, generic enough to reuse elsewhere
 * (BRAND_AND_UI_GUIDELINES.md section 4 lists Dropdown as a shared primitive). Deliberately minimal:
 * no submenus, no portal — a fixed-position panel under the trigger closes on outside click, on
 * Escape, or after an item is chosen.
 */
export function Menu({ trigger, triggerLabel, items, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full transition-shadow duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={triggerLabel}
          className={cn(
            'animate-menu-in motion-reduce:animate-none absolute z-20 mt-2 w-48 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm transition-colors duration-150 ease-in-out hover:bg-surface-muted',
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
