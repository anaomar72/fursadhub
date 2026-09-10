import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'

export interface BreadcrumbItem {
  label: ReactNode
  /** In-app destination — rendered as a router Link, so it does not reload the application. */
  to?: string
  /** External destination. Use `to` for anything inside FursadHub. */
  href?: string
  onClick?: () => void
}

const LINK_CLASSES =
  'truncate text-foreground-secondary hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/**
 * "Where am I, and how do I get back" for pages nested under a list — create/edit forms, detail
 * screens. The last crumb is the current page and is never a link.
 *
 * <p>`to` renders a router {@code Link}; a bare `href` renders an `<a>` and is for genuinely
 * external destinations only. Before this distinction existed every crumb was an `<a>`, which meant
 * clicking one dropped the SPA and reloaded the whole application.
 */
export function Breadcrumbs({ items, label = 'Breadcrumb' }: { items: BreadcrumbItem[]; label?: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <Icon name="chevronRight" className="size-4 shrink-0 text-muted" />}
            {item.to ? (
              <Link to={item.to} onClick={item.onClick} className={LINK_CLASSES}>
                {item.label}
              </Link>
            ) : item.href ? (
              <a href={item.href} onClick={item.onClick} className={LINK_CLASSES}>
                {item.label}
              </a>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className="truncate font-medium text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
