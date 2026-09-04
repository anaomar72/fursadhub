import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: 'brand'|'neutral'|'success'|'warning'|'danger'|'info'; selected?: boolean }
const tones = { brand:'bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info', neutral:'bg-surface-muted text-foreground-secondary', success:'bg-success-bg text-success', warning:'bg-warning-bg text-warning', danger:'bg-danger-bg text-danger', info:'bg-info-bg text-info' }
export function Badge({ tone='neutral', selected, className, ...props }: BadgeProps) { return <span className={cn('inline-flex max-w-full items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold', tones[tone], selected && 'border-brand-primary ring-1 ring-brand-primary', className)} {...props}/> }
