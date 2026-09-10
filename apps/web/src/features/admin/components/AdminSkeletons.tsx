import { useTranslation } from 'react-i18next'
import { Skeleton, SkeletonRegion } from '../../../components/ui'

/**
 * Loading placeholders shaped like the platform console's own three layouts.
 *
 * <p>The admin pages previously all showed the same centred spinner in a bordered box, which is the
 * one loading treatment the rest of FursadHub had already moved away from: it tells the reader
 * nothing about what is arriving, and the page jumps when the real content replaces a box of a
 * completely different height. These stand in at the geometry of the thing being fetched — the
 * table's own header row and column count, the dashboard's metric grid, a detail page's field
 * stack — so the layout is stable across the swap and the console does not flash.
 *
 * <p>Each block announces itself ONCE through {@link SkeletonRegion}. The individual bars are
 * {@code aria-hidden} decoration, so a twelve-bar table skeleton does not read out "Loading" twelve
 * times, and every bar drops its pulse under {@code prefers-reduced-motion}.
 */

/**
 * A DataTable that has not arrived yet. Mirrors that component's geometry exactly — same rounded
 * border, same muted header band, same `px-4 py-3` cell rhythm and `divide-y` row rules — so the
 * real table replaces it in place rather than resizing the page under the reader.
 */
export function AdminTableSkeleton({ columns = 4, rows = 6 }: { columns?: number; rows?: number }) {
  const { t } = useTranslation()

  return (
    <SkeletonRegion
      label={t('common:status.loading')}
      className="max-w-full overflow-hidden rounded-lg border border-border bg-surface"
    >
      <div className="flex gap-4 border-b border-border bg-surface-muted px-4 py-3">
        {Array.from({ length: columns }).map((_, column) => (
          <Skeleton key={column} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, column) => (
              <Skeleton key={column} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}

/**
 * The dashboard's headline counts. A grid of cards rather than one bar, because that is what lands:
 * seeing the shape of the overview form before the numbers fill it is the point.
 */
export function AdminMetricsSkeleton({ cards = 6 }: { cards?: number }) {
  const { t } = useTranslation()

  return (
    <SkeletonRegion
      label={t('common:status.loading')}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: cards }).map((_, card) => (
        <div key={card} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </SkeletonRegion>
  )
}

/**
 * A record page — the institution, account and case detail views, which are all a titled panel over
 * a stack of label/value fields.
 */
export function AdminDetailSkeleton({ fields = 6 }: { fields?: number }) {
  const { t } = useTranslation()

  return (
    <SkeletonRegion label={t('common:status.loading')} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-3 w-48 max-w-full" />
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        {Array.from({ length: fields }).map((_, field) => (
          <div key={field} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}

/**
 * The dashboard's activity chart. One block at the plot's own height, because a chart arrives as a
 * whole — drawing fake axes or a placeholder series here would put a shape on screen that the real
 * data may contradict.
 */
export function AdminChartSkeleton() {
  const { t } = useTranslation()

  return (
    <SkeletonRegion label={t('common:status.loading')}>
      <Skeleton className="h-56 w-full" />
    </SkeletonRegion>
  )
}

/**
 * A short list inside a panel that already has its own border — recent registrations, and anything
 * else that is a stack of rows rather than a table. Unbordered on purpose, so it does not draw a
 * second frame inside the card it sits in.
 */
export function AdminListSkeleton({ rows = 4 }: { rows?: number }) {
  const { t } = useTranslation()

  return (
    <SkeletonRegion label={t('common:status.loading')} className="flex flex-col divide-y divide-border">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center justify-between gap-4 py-3">
          <Skeleton className="h-4 w-48 max-w-[60%]" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </SkeletonRegion>
  )
}
