import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface SectionHeadingProps {
  title: string
  /** One quiet line saying what this section is, when the title alone is not enough. */
  description?: string
  /** Right-aligned control — usually a "View all" link. Wraps under the title on narrow screens. */
  action?: ReactNode
  /** `h2` by default; pass `h3` for a section nested inside another titled section. */
  as?: 'h2' | 'h3'
  /**
   * Adds the ruled card-header chrome for a heading that sits INSIDE a bordered panel
   * (`<Card padding="none">`). Without it the heading is bare, for titling a group of cards.
   */
  panel?: boolean
  id?: string
  className?: string
}

/**
 * The heading a portal section or panel sits under.
 *
 * <p>This exists because an audit of the portals found section titles written **eight different
 * ways** — `font-display text-base font-bold text-brand-navy` in 39 places, `font-semibold
 * text-foreground` in 20, `font-display text-lg font-extrabold` in 9, and five more variants below
 * that. Individually each looked fine; together they are why the portals read as assembled
 * components rather than as one product, because no two panels agreed on how a section announces
 * itself.
 *
 * <p>The treatment follows reference 07's panel headers: the title in the display face and brand
 * navy, an optional supporting line, and an optional action on the right of the same row.
 * `PageHeader` remains the page-level `h1`; this is the level below it.
 */
export function SectionHeading({
  title,
  description,
  action,
  as: Tag = 'h2',
  panel = false,
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div
      // A panel header's rule is the workspace family's, so a panel announces which workspace it
      // belongs to at the same time as it announces its section. Unset outside a workspace, where
      // the `border-border` class below is what applies.
      style={panel ? { borderBottomColor: 'var(--workspace-rule, var(--color-border))' } : undefined}
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2',
        panel && 'border-b border-border px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <Tag
          id={id}
          className={cn(
            'font-display font-bold tracking-tight text-brand-navy dark:text-foreground',
            Tag === 'h2' ? 'text-base' : 'text-sm',
          )}
        >
          {title}
        </Tag>
        {description && (
          <p className="mt-1 text-xs leading-5 text-foreground-secondary">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  )
}
