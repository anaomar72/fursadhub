import { useQueries } from '@tanstack/react-query'
import * as adminApi from '../api/adminApi'

/** How many months the activity chart covers. Twelve requests, one per bucket. */
export const ACTIVITY_MONTHS = 12

export interface ActivityBucket {
  /** First instant of the month, UTC — the bucket's identity and its query lower bound. */
  start: Date
  /** Exclusive upper bound: the first instant of the following month. */
  end: Date
  /** Events of the chosen type in this month, or undefined while loading / on failure. */
  count: number | undefined
  isError: boolean
}

export interface PlatformActivity {
  buckets: ActivityBucket[]
  isLoading: boolean
  /** True when at least one month failed; the months that succeeded still plot. */
  hasErrors: boolean
  /**
   * True when NO month could be counted. The difference matters: a partly-failed series is still
   * worth drawing with a warning, but a wholly-failed one plotted as zeroes would read as "nothing
   * happened all year" — a fabricated fact, not a gap.
   */
  allFailed: boolean
}

/**
 * Platform activity over the last twelve months, counted by the server.
 *
 * <p>There is no analytics or time-series endpoint in FursadHub — {@code /admin/statistics} returns
 * point-in-time counts only. What DOES exist is an audit trail that
 * {@code AdminComplianceController} will filter by `eventType`, `from` and `to`, and a
 * {@code PageResponse} that reports `totalElements` for the filter. So a month's count is one
 * request for the smallest possible page of that month, reading the total and discarding the row.
 *
 * <p>That makes every point a real server-side aggregate rather than a client-side estimate, and it
 * transfers twelve single-element pages instead of a year of audit events. The cost is twelve
 * requests, which is why the window is fixed at a year rather than being a free-form range.
 *
 * <p>Audit events are only written from the moment auditing existed, so early months read as
 * genuinely zero rather than as missing data — which is the honest thing for this chart to show.
 */
export function usePlatformActivity(eventType: string | null, enabled: boolean): PlatformActivity {
  const months = recentMonths(ACTIVITY_MONTHS)

  const results = useQueries({
    queries: months.map((month) => ({
      queryKey: ['admin', 'activity', eventType, month.start.toISOString()],
      queryFn: async () => {
        const page = await adminApi.listAuditEvents({
          eventType: eventType ?? undefined,
          from: month.start.toISOString(),
          to: month.end.toISOString(),
          page: 0,
          size: 1,
        })
        return page.totalElements
      },
      enabled: enabled && eventType !== null,
      staleTime: 5 * 60 * 1000,
      // No retry. This is a fan-out of twelve: when the endpoint is failing, retrying turns one
      // dashboard load into two dozen failing requests, and a month that errored is simply a month
      // this chart cannot draw.
      retry: false,
    })),
  })

  const buckets = months.map((month, index) => ({
    ...month,
    count: results[index]?.data,
    isError: results[index]?.isError ?? false,
  }))
  const settled = results.filter((result) => !result.isLoading)

  return {
    buckets,
    isLoading: results.some((result) => result.isLoading),
    hasErrors: results.some((result) => result.isError),
    allFailed: settled.length > 0 && settled.every((result) => result.isError),
  }
}

/**
 * The last `count` calendar months ending with the current one, as UTC month boundaries.
 *
 * <p>UTC because every timestamp FursadHub stores is UTC (CLAUDE.md section 53) — bucketing by the
 * reader's local month would put an event in a different column depending on who is looking.
 */
export function recentMonths(count: number): Array<{ start: Date; end: Date }> {
  const now = new Date()
  const firstOfThisMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)

  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index
    const start = new Date(firstOfThisMonth)
    start.setUTCMonth(start.getUTCMonth() - offset)
    const end = new Date(start)
    end.setUTCMonth(end.getUTCMonth() + 1)
    return { start, end }
  })
}
