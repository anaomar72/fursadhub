import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'

export interface PageHeaderProps {
  /** Small label above the title — the section a page belongs to, e.g. "Verification". Optional;
   * only worth adding when it tells the reader something the title alone doesn't. */
  eyebrow?: string
  title: string
  description?: string
  /**
   * Right-aligned controls. Put the ONE primary action last; anything else is `outline`/`ghost`.
   * On a phone the row wraps under the title and each control grows to share the width, so the
   * primary action is a full, easy target instead of a small chip in a corner.
   */
  actions?: ReactNode
  /**
   * A way back to the parent list from a detail page — "← Candidates". The label is the
   * DESTINATION, already translated, not the word "Back": it tells the reader where they will land.
   */
  back?: { to: string; label: string }
  className?: string
}

/**
 * The page-level heading — the page's only `<h1>` — for every Student, University, Organization and
 * Admin page: optional way back, eyebrow, title, one supporting line and the page's actions.
 *
 * <p>The application topbar deliberately does NOT repeat this title (it carries global controls
 * only), so this is the single place a page names itself.
 */
export function PageHeader({ eyebrow, title, description, actions, back, className }: PageHeaderProps) {
  return (
    /*
      The rule under the header is the workspace family's, so the same component opens a student
      page under a warm orange hairline, an organization page under a crisp neutral one, and a
      university page under navy.
    */
    <div
      style={{ borderBottomColor: 'var(--workspace-rule)' }}
      className={cn('flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      {/* `min-w-0` + `break-words`: titles are often an email address or an institution name, which
          have no break opportunity and would otherwise push the whole page sideways on a phone. */}
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="mb-2 inline-flex items-center gap-1 rounded-sm text-label text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {/* Mirrors in right-to-left layouts with the text it points along. */}
            <Icon name="chevronLeft" className="size-4 shrink-0 rtl:rotate-180" />
            <span className="break-words">{back.label}</span>
          </Link>
        )}
        {eyebrow && (
          // One eyebrow colour in both themes. It used to switch from orange to blue in dark mode,
          // so the same label meant two different things depending on the theme.
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-accent-ink">{eyebrow}</p>
        )}
        <h1 className={cn('break-words font-display text-title-page text-foreground', eyebrow && 'mt-1')}>{title}</h1>
        {description && <p className="mt-1.5 max-w-prose break-words text-body text-foreground-secondary">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1 sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}
