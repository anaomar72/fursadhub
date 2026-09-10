import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'

export interface SkeletonProps {
  className?: string
}

/**
 * Loading placeholder for cards/lists/tables — see BRAND_AND_UI_GUIDELINES.md section 19.
 *
 * <p>Deliberately silent to assistive technology. Each placeholder used to carry its own
 * `role="status"` and "Loading" label, so a table skeleton of a dozen bars announced "Loading"
 * a dozen times over. A shape standing in for content is decoration; the announcement belongs to
 * the region that is loading, once — which is what {@link SkeletonRegion} is for.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none', className)}
    />
  )
}

export interface SkeletonRegionProps {
  children: ReactNode
  /** Overrides the generic "Loading" announcement when the region has a more useful name. */
  label?: string
  className?: string
}

/**
 * Wraps a group of {@link Skeleton} shapes and makes the single "Loading" announcement for all of
 * them. Use it around any placeholder block containing more than one bar.
 */
export function SkeletonRegion({ children, label, className }: SkeletonRegionProps) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-label={label ?? t('common:status.loading')} className={className}>
      {children}
    </div>
  )
}
