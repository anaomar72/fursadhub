import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils/cn'

export interface AreaTabItem {
  to: string
  label: string
  /** Omit the tab entirely rather than disabling it — e.g. staff-only tabs for a non-admin member. */
  hidden?: boolean
}

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
    isActive
      ? 'bg-brand-primary text-on-brand'
      : 'text-foreground-secondary hover:bg-surface-muted hover:text-foreground',
  )

/**
 * The second-level navigation row for every role area (Student/University/Organization/Admin/
 * Account) — one shared component instead of five copies of the same `NavLink` markup, so a change
 * here is a change everywhere (CLAUDE.md section 4: "Do not rebuild differently styled ... inside
 * every feature"). Scrolls horizontally rather than wrapping on narrow screens, since these areas
 * can carry seven-plus tabs (BRAND_AND_UI_GUIDELINES.md section 8).
 */
export function AreaTabs({ items }: { items: AreaTabItem[] }) {
  return (
    <div className="border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 sm:px-6">
        {items
          .filter((item) => !item.hidden)
          .map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClasses}>
              {item.label}
            </NavLink>
          ))}
      </nav>
    </div>
  )
}
