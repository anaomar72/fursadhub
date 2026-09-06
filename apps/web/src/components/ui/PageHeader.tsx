import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface PageHeaderProps {
  /** Small label above the title — the section a page belongs to, e.g. "Verification". Optional;
   * only worth adding when it tells the reader something the title alone doesn't. */
  eyebrow?: string
  title: string
  description?: string
  /** Right-aligned controls — usually a primary `<Button>`. Wraps under the title on narrow
   * screens rather than forcing horizontal scroll (BRAND_AND_UI_GUIDELINES.md section 8). */
  actions?: ReactNode
  className?: string
}

/**
 * The heading every feature page reaches for instead of a bare `<h1>` — one consistent "here's
 * where you are, here's what you can do" treatment across Student/University/Organization/Admin
 * (BRAND_AND_UI_GUIDELINES.md section 6: "all areas must clearly belong to one FursadHub product").
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      {/* `min-w-0` + `break-words`: titles are often an email address or an institution name, which
          have no break opportunity and would otherwise push the whole page sideways on a phone
          rather than wrapping (BRAND_AND_UI_GUIDELINES.md section 8 — never page-level overflow). */}
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent-ink dark:text-info">{eyebrow}</p>
        )}
        <h1 className="mt-1 break-words font-display text-2xl font-extrabold tracking-[-0.02em] text-brand-navy dark:text-foreground sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 break-words text-sm text-foreground-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
