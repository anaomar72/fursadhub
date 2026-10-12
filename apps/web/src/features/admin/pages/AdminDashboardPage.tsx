import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  AttentionQueue,
  Card,
  ErrorState,
  LineChart,
  Metric,
  PageHeader,
  Panel,
  Select,
  SkeletonList,
  StatusBadge,
} from '../../../components/ui'
import { AdminChartSkeleton, AdminListSkeleton } from '../components/AdminSkeletons'
import * as adminApi from '../api/adminApi'
import { adminQueries } from '../adminQueries'
import { awaitingReview } from '../institutionWorkflow'
import {
  headlineCounts,
  platformAttention,
  platformHealth,
  publiclyDiscoverable,
  systemSignals,
} from '../platformMetrics'
import { usePlatformActivity, ACTIVITY_MONTHS } from '../hooks/usePlatformActivity'
import { formatDate, formatMonth } from '../../../lib/utils/formatDate'
import { formatNumber } from '../../../lib/utils/formatNumber'
import { INSTITUTION_STATUS_TONE, statisticTone, USER_STATUS_TONE } from '../statusTone'
import type { AdminOrganization, AdminUniversity, PlatformStatistics } from '../types'

/** How many recent accounts the registrations panel shows. One page, newest first. */
const RECENT_REGISTRATIONS = 6

/** How many institutions the review queue shows before "View all". */
const QUEUE_ROWS = 8

/**
 * Which audit event the activity chart opens on, best first.
 *
 * <p>These are the high-volume events that actually describe platform activity. Only ones present
 * in the trail are offered, so this is a preference order, not an assumption that any exist.
 */
const PREFERRED_EVENT_TYPES = ['LOGIN_SUCCESS', 'EMAIL_VERIFIED', 'CANDIDACY_APPLICATION_SUBMITTED']

const linkClass =
  'rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/**
 * The platform overview — the Super Admin console's home (Phase 8: operations first).
 *
 * <p>Order is priority: what needs intervention (real queues, each linking to its filtered list),
 * four operational figures, the institution review queue as the primary work, then context — system
 * signals, recent registrations, the activity chart and records by status.
 *
 * <p>Every figure comes from {@code GET /admin/statistics}; the queue reads the same first pages the
 * verification lists read (same cache entries); the chart counts audit events month by month; recent
 * registrations is the first page of {@code /admin/users}. Each block loads and fails on its own —
 * a statistics outage no longer blanks the queue, the chart or the registrations.
 *
 * <p>SUPER_ADMIN only — {@code PlatformStatisticsService.collect} requires it, and the route guard
 * sends a verification officer to their own queue instead.
 */
export function AdminDashboardPage() {
  const { t } = useTranslation()
  const statisticsQuery = useQuery(adminQueries.statistics())
  // The moderation queue's own total — the statistics endpoint does not carry it.
  const testimonialsQuery = useQuery({ ...adminQueries.testimonials('SUBMITTED'), retry: false })
  const statistics = statisticsQuery.data

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t('admin:dashboard.eyebrow')} title={t('admin:dashboard.title')} description={t('admin:dashboard.subtitle')} />

      {statisticsQuery.isLoading ? (
        <section aria-label={t('admin:dashboard.needsAttention')} aria-busy="true">
          <SkeletonList rows={3} />
        </section>
      ) : statisticsQuery.isError || !statistics ? (
        <section aria-labelledby="admin-attention-error" className="flex flex-col gap-3">
          <h2 id="admin-attention-error" className="text-title-section text-foreground">
            {t('admin:dashboard.needsAttention')}
          </h2>
          <ErrorState
            variant="inline"
            description={t('admin:dashboard.unavailable')}
            onRetry={() => void statisticsQuery.refetch()}
            retryLabel={t('common:actions.retry')}
          />
        </section>
      ) : (
        <>
          <AttentionQueue
            title={t('admin:dashboard.needsAttention')}
            clearTitle={t('admin:dashboard.attention.clearTitle')}
            clearBody={t('admin:dashboard.attention.clearBody')}
            items={platformAttention(statistics, testimonialsQuery.data?.totalElements).map((item) => ({
              id: item.kind,
              count: item.count,
              title: t(`admin:dashboard.attention.items.${item.kind}`, { count: item.count }),
              action: { label: t('admin:dashboard.attention.open'), to: item.to },
            }))}
          />
          <HealthMetrics statistics={statistics} />
        </>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <ReviewQueue />
        <div className="flex min-w-0 flex-col gap-6">
          <SystemSignals statistics={statistics} loading={statisticsQuery.isLoading} />
          <RecentRegistrations />
        </div>
      </div>

      <ActivityPanel />

      {statistics && <RecordsByStatus statistics={statistics} />}
    </div>
  )
}

/** Four figures, each a real count. No trends: there is no historical metric endpoint. */
function HealthMetrics({ statistics }: { statistics: PlatformStatistics }) {
  const { t } = useTranslation()
  const health = platformHealth(statistics)
  const { published } = publiclyDiscoverable(statistics)
  return (
    <section aria-label={t('admin:dashboard.health.title')}>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-border bg-surface p-5 lg:grid-cols-4">
        <li className="min-w-0">
          <Metric label={t('admin:dashboard.health.activeAccounts')} value={formatNumber(health.activeAccounts)} to="/admin/users?status=ACTIVE" />
        </li>
        <li className="min-w-0">
          <Metric label={t('admin:dashboard.health.verifiedInstitutions')} value={formatNumber(health.verifiedInstitutions)} />
        </li>
        <li className="min-w-0">
          <Metric
            label={t('admin:dashboard.health.discoverableInternships')}
            value={formatNumber(health.discoverableInternships)}
            context={published > 0 ? t('admin:dashboard.health.ofPublished', { count: published }) : undefined}
            to="/admin/opportunities"
          />
        </li>
        <li className="min-w-0">
          <Metric label={t('admin:dashboard.health.activePlacements')} value={formatNumber(health.activePlacements)} />
        </li>
      </ul>
    </section>
  )
}

type QueueRow = { kind: 'organizations' | 'universities'; record: AdminOrganization | AdminUniversity }

/**
 * Institutions waiting on a reviewer — SUBMITTED and UNDER_REVIEW, both kinds — oldest evidence
 * first, so nothing waits longest unseen. There is no SLA on the backend, so nothing here claims
 * urgency beyond the order. Reads the same first pages the verification lists read (shared cache).
 */
function ReviewQueue() {
  const { t } = useTranslation()
  const orgSubmitted = useQuery(adminQueries.organizations('SUBMITTED'))
  const orgReview = useQuery(adminQueries.organizations('UNDER_REVIEW'))
  const uniSubmitted = useQuery(adminQueries.universities('SUBMITTED'))
  const uniReview = useQuery(adminQueries.universities('UNDER_REVIEW'))
  const sources = [
    { kind: 'organizations' as const, query: orgSubmitted },
    { kind: 'organizations' as const, query: orgReview },
    { kind: 'universities' as const, query: uniSubmitted },
    { kind: 'universities' as const, query: uniReview },
  ]
  const loading = sources.some((source) => source.query.isLoading)
  const failed = sources.filter((source) => source.query.isError)
  const rows: QueueRow[] = sources
    .flatMap((source) =>
      ((source.query.data?.content ?? []) as (AdminOrganization | AdminUniversity)[]).map((record) => ({ kind: source.kind, record })),
    )
    .filter((row) => awaitingReview(row.record.verificationStatus))
    .sort((a, b) => (a.record.evidenceUploadedAt ?? a.record.createdAt).localeCompare(b.record.evidenceUploadedAt ?? b.record.createdAt))
  const shown = rows.slice(0, QUEUE_ROWS)

  return (
    <Panel
      title={t('admin:dashboard.queue.title')}
      description={t('admin:dashboard.queue.description')}
      padding={!loading && failed.length < sources.length && shown.length > 0 ? 'none' : 'default'}
      action={
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/admin/organizations" className={linkClass}>
            {t('admin:nav.organizations')}
          </Link>
          <Link to="/admin/universities" className={linkClass}>
            {t('admin:nav.universities')}
          </Link>
        </span>
      }
    >
      {loading ? (
        <SkeletonList rows={4} />
      ) : failed.length === sources.length ? (
        <ErrorState variant="inline" onRetry={() => failed.forEach((source) => void source.query.refetch())} retryLabel={t('common:actions.retry')} />
      ) : (
        <>
          {shown.length === 0 ? (
            <p className="text-body text-foreground-secondary">{t('admin:dashboard.queue.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map(({ kind, record }) => (
                <li key={`${kind}-${record.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <Link to={`/admin/${kind}/${record.id}`} className={`block break-words ${linkClass} text-foreground`}>
                      {record.name}
                    </Link>
                    <span className="mt-0.5 block text-caption text-foreground-secondary">
                      {t(`admin:dashboard.queue.kind.${kind}`)} ·{' '}
                      {record.hasEvidence
                        ? t('admin:verification.evidenceOn', { date: formatDate(record.evidenceUploadedAt) })
                        : t(`admin:${kind}.noEvidence`)}
                    </span>
                  </span>
                  <StatusBadge tone={INSTITUTION_STATUS_TONE[record.verificationStatus]}>
                    {t(`admin:statusLabels.${record.verificationStatus}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
          {failed.length > 0 && (
            <p className="border-t border-border px-5 py-3 text-caption text-foreground-secondary" role="status">
              {t('admin:dashboard.queue.partial')}
            </p>
          )}
        </>
      )}
    </Panel>
  )
}

/** Watched, not worked: failures with no screen behind them, stated plainly with a status word. */
function SystemSignals({ statistics, loading }: { statistics: PlatformStatistics | undefined; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <Panel title={t('admin:dashboard.signals.title')} description={t('admin:dashboard.signals.description')}>
      {loading ? (
        <SkeletonList rows={2} />
      ) : !statistics ? (
        <p className="text-body text-foreground-secondary">{t('admin:dashboard.unavailable')}</p>
      ) : (
        <dl className="flex flex-col gap-3">
          {systemSignals(statistics).map((signal) => (
            <div key={signal.id} className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-body text-foreground-secondary">{t(`admin:dashboard.${signal.id}`)}</dt>
              <dd className="flex items-center gap-2">
                <span className="text-body font-semibold text-foreground">{formatNumber(signal.value)}</span>
                <StatusBadge tone={signal.tone}>
                  {signal.id === 'recentLoginFailures'
                    ? t('admin:dashboard.monitoring')
                    : signal.value === 0
                      ? t('admin:dashboard.clear')
                      : t('admin:dashboard.signals.investigate')}
                </StatusBadge>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  )
}

/**
 * Every population the statistics endpoint counts, with its status split — dense, secondary
 * context. Tones resolve per state machine (a placement CANCELLED is not an opportunity CANCELLED).
 */
function RecordsByStatus({ statistics }: { statistics: PlatformStatistics }) {
  const { t } = useTranslation()
  const { discoverable, published, hidden } = publiclyDiscoverable(statistics)
  return (
    <Panel title={t('admin:dashboard.records.title')} description={t('admin:dashboard.records.description')} padding="none">
      <ul className="divide-y divide-border">
        {headlineCounts(statistics).map((count) => (
          <li key={count.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-6">
            <span className="flex min-w-0 items-baseline gap-3 sm:w-56 sm:shrink-0">
              {count.to ? (
                <Link to={count.to} className={`${linkClass} text-foreground`}>
                  {t(`admin:dashboard.counts.${count.id}`)}
                </Link>
              ) : (
                <span className="text-body font-semibold text-foreground">{t(`admin:dashboard.counts.${count.id}`)}</span>
              )}
              <span className="text-body font-semibold text-foreground">{formatNumber(count.value)}</span>
            </span>
            {count.breakdown && count.machine && Object.keys(count.breakdown).length > 0 ? (
              <ul className="flex flex-wrap gap-1.5" aria-label={t('admin:dashboard.byStatus')}>
                {Object.entries(count.breakdown).map(([status, value]) => (
                  <li key={status}>
                    <StatusBadge tone={statisticTone(count.machine!, status)}>
                      {t(`admin:statusLabels.${status}`, status)} · {formatNumber(value)}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {published > 0 && (
        <p className="border-t border-border px-5 py-3 text-caption text-foreground-secondary">
          {t('admin:dashboard.publicVisibility', { discoverable: formatNumber(discoverable), published: formatNumber(published) })}
          {hidden > 0 ? ` ${t('admin:dashboard.publicVisibilityHidden', { count: hidden })}` : ''}
        </p>
      )}
    </Panel>
  )
}

/**
 * Platform activity by month, in the approved design's chart slot.
 *
 * <p>The prototype's "Platform Growth" needed a registrations-over-time series, which no endpoint
 * provides. This is the real equivalent: audit-event volume, counted server-side one month at a
 * time. The event type is chosen from the trail's OWN distinct types
 * ({@code GET /admin/audit-events/types}), so the selector can never offer an event FursadHub does
 * not actually record.
 */
function ActivityPanel() {
  const { t } = useTranslation()
  const [eventType, setEventType] = useState<string | null>(null)

  // The same key the audit page uses for its type list.
  const typesQuery = useQuery({ queryKey: ['admin', 'audit', 'types'], queryFn: adminApi.listAuditEventTypes, retry: false })

  const types = typesQuery.data ?? []
  // The list arrives alphabetically, so types[0] is whatever sorts first — ACCOUNT_SUSPENDED on a
  // real trail, which is the rarest event and a useless default. Prefer an event that actually
  // tracks platform activity, and fall back to the alphabetical first only if none are recorded.
  const selected = eventType ?? PREFERRED_EVENT_TYPES.find((type) => types.includes(type)) ?? types[0] ?? null
  const activity = usePlatformActivity(selected, types.length > 0)

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{t('admin:dashboard.activity.title')}</h2>
          <p className="text-sm text-foreground-secondary">
            {t('admin:dashboard.activity.subtitle', { count: ACTIVITY_MONTHS })}
          </p>
        </div>
        <Select
          aria-label={t('admin:dashboard.activity.eventType')}
          className="w-full sm:w-64"
          value={selected ?? ''}
          onChange={(event) => setEventType(event.target.value)}
          disabled={types.length === 0}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {t(`admin:auditEventTypes.${type}`, type.replaceAll('_', ' '))}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        {typesQuery.isLoading || activity.isLoading ? (
          <AdminChartSkeleton />
        ) : types.length === 0 ? (
          <p className="py-10 text-center text-sm text-foreground-secondary">
            {t('admin:dashboard.activity.empty')}
          </p>
        ) : activity.allFailed ? (
          // Every month failed. Plotting `count ?? 0` here would draw a flat line along zero, which
          // reads as "nothing happened all year" — a fabricated fact rather than a missing one.
          <ErrorState
            variant="inline"
            description={t('admin:dashboard.activity.unavailable')}
            onRetry={() => void typesQuery.refetch()}
            retryLabel={t('common:actions.retry')}
          />
        ) : (
          <>
            {activity.hasErrors && (
              <p role="alert" className="mb-2 text-xs text-danger">
                {t('admin:dashboard.activity.partialError')}
              </p>
            )}
            <LineChart
              caption={t('admin:dashboard.activity.caption')}
              seriesLabel={t('admin:dashboard.activity.series')}
              valueLabel={t('admin:dashboard.activity.events')}
              tableLabel={t('admin:dashboard.activity.showTable')}
              emptyLabel={t('admin:dashboard.activity.empty')}
              // Only months that actually came back. A month that failed is left OUT of the series
              // rather than plotted as zero — a gap is honest, a zero is a claim.
              points={activity.buckets
                .filter((bucket) => bucket.count !== undefined)
                .map((bucket) => ({
                  label: formatMonth(bucket.start),
                  fullLabel: formatMonth(bucket.start, 'long'),
                  value: bucket.count!,
                }))}
            />
          </>
        )}
      </div>
    </Card>
  )
}

/**
 * The newest accounts on the platform.
 *
 * <p>Real: {@code AdminController.searchUsers} defaults its sort to `createdAt` descending, so the
 * first page IS the recent-registrations list without any endpoint being added.
 *
 * <p>The approved design labelled each row with an account type — Student, Organization, University.
 * {@code AdminUserResponse} carries no such field (it is email, status, locale and timestamps), and
 * there is no platform endpoint that resolves an account's memberships. The row shows account status
 * instead, which is real and is the thing an administrator would act on.
 */
function RecentRegistrations() {
  const { t } = useTranslation()

  // The first page of the accounts list (the backend sorts newest first) — the same cache entry.
  const usersQuery = useQuery(adminQueries.users())

  const users = (usersQuery.data?.content ?? []).slice(0, RECENT_REGISTRATIONS)

  return (
    <Card padding="lg" className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-foreground">{t('admin:dashboard.recent.title')}</h2>
        <Link
          to="/admin/users"
          className="rounded text-sm font-semibold text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {t('admin:dashboard.viewAll')}
        </Link>
      </div>

      {usersQuery.isLoading ? (
        <AdminListSkeleton />
      ) : usersQuery.isError ? (
        <p className="py-6 text-sm text-foreground-secondary">{t('admin:dashboard.recent.unavailable')}</p>
      ) : users.length === 0 ? (
        <p className="py-6 text-sm text-foreground-secondary">{t('admin:dashboard.recent.empty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link
                  to={`/admin/users/${user.id}`}
                  className="block truncate rounded text-sm font-medium text-foreground hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {user.email}
                </Link>
                <p className="text-xs text-muted">{formatDate(user.createdAt)}</p>
              </div>
              <StatusBadge tone={USER_STATUS_TONE[user.status]}>
                {t(`admin:statusLabels.${user.status}`)}
              </StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
