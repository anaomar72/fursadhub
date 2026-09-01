import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface EmptyStateProps {
  title: string
  description?: string
  /** A single primary control, usually a `<Button>` or a `<Link>` styled as one — the "invitation to
   * act" (frontend-design guidance): an empty list is a place to start, not a dead end. */
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

function DefaultIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M4 14 8 5h12l4 9M4 14v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7M4 14h6a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Replaces a bare "No X match" line wherever a list can come back empty (BRAND_AND_UI_GUIDELINES.md
 * section 4). Kept deliberately quiet — the landing page's doors already spend this product's one
 * bold visual move, so this stays a small muted glyph, never a second signature element.
 */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-foreground-secondary">
        {icon ?? <DefaultIcon />}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-foreground-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}
