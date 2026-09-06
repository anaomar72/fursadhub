import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: 'brand'|'accent'|'neutral'|'success'|'warning'|'danger'|'info'; selected?: boolean }
/**
 * `brand` is the approved blue skill/category chip that fills the internship cards throughout
 * design-reference/presentation-refresh-2026; `accent` is the sparing orange emphasis chip. Both
 * read from the one central palette in `lib/design-system/tokens.css`.
 */
const tones = { brand:'bg-brand-blue-soft text-brand-blue', accent:'bg-brand-accent-soft text-brand-accent-ink', neutral:'bg-surface-muted text-foreground-secondary', success:'bg-success-bg text-success', warning:'bg-warning-bg text-warning', danger:'bg-danger-bg text-danger', info:'bg-info-bg text-info' }
export function Badge({ tone='neutral', selected, className, ...props }: BadgeProps) { return <span className={cn('inline-flex max-w-full items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold', tones[tone], selected && 'border-brand-accent ring-1 ring-brand-accent', className)} {...props}/> }
