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
   * Adds the ruled header chrome for a heading that sits INSIDE a bordered surface. Prefer
   * {@link Panel}, which applies this for you; the flag remains for existing `<Card padding="none">`
   * call sites.
   */
  panel?: boolean
  id?: string
  className?: string
}

/**
 * THE section / panel header — the level below `PageHeader`'s `<h1>`. One title role
 * (`text-title-panel`), one supporting line, one optional action on the same row.
 *
 * <p>This is the shared pattern the Phase 1 audit asked for: portal section titles were written
 * twelve different ways (`font-display text-base font-bold text-brand-navy dark:text-foreground` in
 * 34 places alone). New code uses this — or {@link Panel}, which renders it — and never hand-writes
 * a section `<h2>`.
 *
 * <p>Use it bare to title a group of cards or a plain section of the page; use it through `Panel`
 * when the content genuinely needs its own surface.
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
      // belongs to at the same time as it announces its section.
      style={panel ? { borderBottomColor: 'var(--workspace-rule, var(--color-border))' } : undefined}
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2',
        panel && 'border-b border-border px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <Tag
          id={id}
          className={cn(
            'break-words font-display text-foreground',
            Tag === 'h2' ? 'text-title-panel' : 'text-body font-bold',
          )}
        >
          {title}
        </Tag>
        {description && <p className="mt-0.5 break-words text-body text-foreground-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0 text-body">{action}</div>}
    </div>
  )
}
