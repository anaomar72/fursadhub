import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'
import { SectionHeading } from './SectionHeading'

export interface PanelProps {
  /** Omit only for a panel whose content titles itself (rare). */
  title?: string
  description?: string
  /** Header control — a "View all" link or one small button. */
  action?: ReactNode
  /** Ruled footer for secondary actions or a summary line. */
  footer?: ReactNode
  /**
   * Body padding: `default` 24px, `compact` 16px, `none` for a body that is itself a list or table
   * running edge to edge (its rows bring their own padding).
   */
  padding?: 'default' | 'compact' | 'none'
  /** `h2` by default; `h3` when the panel sits inside another titled section. */
  headingLevel?: 'h2' | 'h3'
  className?: string
  bodyClassName?: string
  children: ReactNode
}

const BODY_PADDING = {
  default: 'p-6',
  compact: 'p-4',
  none: '',
} as const

/**
 * A titled content surface: header, body, optional footer — a `<section>` named by its own title.
 *
 * <p><strong>When to use it.</strong> When a block of content is a self-contained module that the
 * reader scans as one unit next to other modules — a dashboard's "Recent applications", a detail
 * page's "Documents". It replaces the hand-written `rounded-* border … bg-surface` containers
 * (86 of them across 57 files at the Phase 1 audit) with one surface whose corner, border and rule
 * all come from the design system.
 *
 * <p><strong>When NOT to use it.</strong>
 * <ul>
 *   <li>Page-level content that already sits in the page column — a form, a single list, a block of
 *       prose. Use a plain section titled with {@link SectionHeading}; the page is the surface.</li>
 *   <li>Inside another Panel or Card. Never nest surfaces: group with spacing, a divider, or an inset
 *       (`bg-surface-muted`) region instead.</li>
 *   <li>For a clickable tile — that is an interactive `Card`.</li>
 * </ul>
 *
 * <p>A panel is static, so it has a hairline border and NO shadow — it is part of the page, not
 * floating above it. Corners follow the workspace family, capped at the 16px surface radius.
 */
export function Panel({
  title,
  description,
  action,
  footer,
  padding = 'default',
  headingLevel = 'h2',
  className,
  bodyClassName,
  children,
}: PanelProps) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      style={{ borderRadius: 'var(--workspace-radius, var(--radius-panel))' }}
      className={cn('min-w-0 overflow-hidden border border-border bg-surface', className)}
    >
      {title && (
        <SectionHeading id={headingId} as={headingLevel} title={title} description={description} action={action} panel />
      )}
      <div className={cn(BODY_PADDING[padding], bodyClassName)}>{children}</div>
      {footer && <div className="border-t border-border px-5 py-3 text-body text-foreground-secondary">{footer}</div>}
    </section>
  )
}
