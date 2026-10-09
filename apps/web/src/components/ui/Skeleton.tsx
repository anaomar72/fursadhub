import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'

export interface SkeletonProps {
  className?: string
}

/**
 * Loading placeholder for cards/lists/tables — see CLAUDE.md section 57.
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

/*
 * LAYOUT-SHAPED PRESETS.
 *
 * A placeholder is only useful if it has the shape of what is coming: the eye locates the panel,
 * the figures and the rows before they land, and nothing jumps when they do. A centred spinner in a
 * box (what `LoadingState` draws, on 49 pages at the Phase 1 audit) has no shape at all, so the
 * page goes blank and then reflows. These presets are the shapes the portals actually render; each
 * is wrapped in ONE {@link SkeletonRegion}, so it announces "Loading" once.
 *
 * Widths vary deterministically by index rather than randomly, so a skeleton renders identically on
 * every pass (and in tests) instead of shimmering into a new shape on each re-render.
 */
const LINE_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4']
const TITLE_WIDTHS = ['w-3/5', 'w-1/2', 'w-2/3', 'w-2/5']

/** Lines of body text. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 && lines > 1 ? 'w-1/2' : LINE_WIDTHS[i % LINE_WIDTHS.length])} />
      ))}
    </div>
  )
}

/** A row of KPI tiles — the shape of a dashboard's StatCard row. */
export function SkeletonMetricRow({ count = 4, label, className }: { count?: number; label?: string; className?: string }) {
  return (
    <SkeletonRegion label={label} className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-5">
          <Skeleton className="size-11 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-7 w-1/3" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  )
}

/** A list of rows — avatar/icon, a title line and a meta line. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <ul aria-hidden="true" className={cn('divide-y divide-border', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className={cn('h-3.5', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A {@link Panel}-shaped placeholder: header rule, then a list body. */
export function SkeletonPanel({ rows = 4, label, className }: { rows?: number; label?: string; className?: string }) {
  return (
    <SkeletonRegion label={label} className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      <SkeletonList rows={rows} />
    </SkeletonRegion>
  )
}

/**
 * The responsive card grid public lists use: columns come from the WIDTH available (`auto-fill`,
 * 17rem minimum), so one, two or twelve results each fill a row naturally instead of leaving holes
 * in a fixed-column grid.
 */
export const CARD_GRID = 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]'

/** Card-shaped placeholders in {@link CARD_GRID}: a mark, a title, two meta lines and a ruled footer. */
export function SkeletonCardGrid({ count = 3, label, className }: { count?: number; label?: string; className?: string }) {
  return (
    <SkeletonRegion label={label} className={cn(CARD_GRID, className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex h-full flex-col rounded-xl border border-border bg-surface">
          <div className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-md" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="mt-1 h-5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="mt-auto border-t border-border px-5 py-3">
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  )
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
