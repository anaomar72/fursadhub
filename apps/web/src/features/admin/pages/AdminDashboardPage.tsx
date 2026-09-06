import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Card,
  ErrorState,
  Icon,
  LineChart,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  StatusDistribution,
  type IconName,
} from '../../../components/ui'
import * as adminApi from '../api/adminApi'
import {
  attentionItems,
  headlineCounts,
  publiclyDiscoverable,
  type HeadlineCount,
} from '../platformMetrics'
import { usePlatformActivity, ACTIVITY_MONTHS } from '../hooks/usePlatformActivity'
import { formatDate, formatMonth } from '../../../lib/utils/formatDate'
import { formatNumber } from '../../../lib/utils/formatNumber'
import { distributionTone, USER_STATUS_TONE } from '../statusTone'
import type { PlatformStatistics } from '../types'

const HEADLINE_ICONS: Record<string, IconName> = {
  users: 'users',
  students: 'user',
  universities: 'bank',
  organizations: 'building',
  opportunities: 'briefcase',
  candidacies: 'document',
  placements: 'badgeCheck',
}

/** How many recent accounts the registrations panel shows. One page, newest first. */
const RECENT_REGISTRATIONS = 6

/**
 * Which audit event the activity chart opens on, best first.
 *
 * <p>These are the high-volume events that actually describe platform activity. Only ones present
 * in the trail are offered, so this is a preference order, not an assumption that any exist.
 */
const PREFERRED_EVENT_TYPES = ['LOGIN_SUCCESS', 'EMAIL_VERIFIED', 'CANDIDACY_APPLICATION_SUBMITTED']

/**
 * The platform overview — the Super Admin console's home.
 *
 * <p>Every figure comes from {@code GET /admin/statistics}, and nothing on this page is a
 * placeholder: where the approved design asked for a metric FursadHub does not collect, the card
 * carries a real one instead rather than a plausible-looking number. {@code platformMetrics} records
 * which two those were and why.
 *
 * <p>Three panels are not aggregate counts and are therefore built from their own real sources: the
 * activity chart counts audit events month by month through the audit endpoint's own date filter,
 * and recent registrations is the first page of {@code /admin/users}, which the backend already
 * sorts newest-first. Neither invents a series.
 *
 * <p>SUPER_ADMIN only — {@code PlatformStatisticsService.collect} requires it, so a verification
 * officer reaching this route sees the API's own 403 rather than a fabricated client-side refusal.
 */
export function AdminDashboardPage() {
  const { t } = useTranslation()

  const statisticsQuery = useQuery({
    queryKey: ['admin', 'statistics'],
    queryFn: adminApi.getStatistics,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:dashboard.title')}
        description={t('admin:dashboard.subtitle')}
      />

      {statisticsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : statisticsQuery.isError || !statisticsQuery.data ? (
        <ErrorState
          title={t('common:status.error')}
          description={t('admin:dashboard.unavailable')}
          onRetry={() => void statisticsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <section aria-labelledby="admin-headline" className="flex flex-col gap-3">
            <h2 id="admin-headline" className="sr-only">
              {t('admin:dashboard.platform')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {headlineCounts(statisticsQuery.data).slice(0, 4).map((count) => (
                <HeadlineCard key={count.id} count={count} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {headlineCounts(statisticsQuery.data).slice(4).map((count) => (
                <HeadlineCard key={count.id} count={count} wide />
              ))}
            </div>
            <PublicVisibilityNote statistics={statisticsQuery.data} />
          </section>

          <AttentionStrip statistics={statisticsQuery.data} />

          <div className="grid gap-4 xl:grid-cols-3">
            <ActivityPanel className="xl:col-span-2" />
            <RecentRegistrations />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * One headline tile.
 *
 * <p>"View all" appears only where a screen actually exists to list those records. Three of the six
 * counts — internships, applications, placements — have no platform-wide list endpoint anywhere in
 * the API, so they show their real status breakdown instead of a link that would 404 or 403.
 */
function HeadlineCard({ count, wide }: { count: HeadlineCount; wide?: boolean }) {
  const { t } = useTranslation()

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground-secondary">
            {t(`admin:dashboard.counts.${count.id}`)}
          </p>
          <p className="mt-2 text-3xl font-bold leading-none text-brand-navy dark:text-foreground">
            {formatNumber(count.value)}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
          <Icon name={HEADLINE_ICONS[count.id] ?? 'chart'} className="size-5" />
        </span>
      </div>

      {count.breakdown && wide ? (
        <StatusDistribution
          label={t('admin:dashboard.byStatus')}
          emptyLabel={t('admin:dashboard.noRecords')}
          items={Object.entries(count.breakdown).map(([status, value]) => ({
            id: status,
            label: t(`admin:statusLabels.${status}`, status),
            value,
            tone: distributionTone(status),
          }))}
        />
      ) : null}

      {count.to ? (
        <Link
          to={count.to}
          className="mt-auto inline-block rounded text-sm font-semibold text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {t('admin:dashboard.viewAll')}
        </Link>
      ) : count.breakdown && !wide ? (
        <p className="mt-auto text-xs text-muted">
          {t('admin:dashboard.statesCount', { count: Object.keys(count.breakdown).length })}
        </p>
      ) : null}
    </Card>
  )
}

/**
 * How many published internships the public can actually see (Backend Phase B6).
 *
 * <p>A sentence rather than a card, because it is a qualifier on the internships figure above and not
 * a separate population. It says the true thing plainly: PUBLISHED is a stored state, and Backend
 * Phase B1.5 hides some published listings — university-targeted ones by design, and any whose
 * organization has since been suspended. Without this, an administrator comparing the dashboard to
 * the public site would reasonably conclude one of them was broken.
 *
 * <p>The "hidden" figure is a subtraction of two real counts, not an estimate, and it renders only
 * when there is genuinely something published to describe.
 */
function PublicVisibilityNote({ statistics }: { statistics: PlatformStatistics }) {
  const { t } = useTranslation()
  const { discoverable, published, hidden } = publiclyDiscoverable(statistics)

  if (published === 0) {
    return null
  }

  return (
    <p className="text-sm text-foreground-secondary">
      {t('admin:dashboard.publicVisibility', {
        discoverable: formatNumber(discoverable),
        published: formatNumber(published),
      })}
      {hidden > 0 ? ` ${t('admin:dashboard.publicVisibilityHidden', { count: hidden })}` : ''}
    </p>
  )
}

/**
 * The operations strip: the four counts that mean somebody has work to do right now.
 *
 * <p>Not in the approved prototype, which was drawn as a growth dashboard. It is here because
 * {@code PlatformStatistics} carries all four — a failing mail outbox and a spike of login failures
 * are exactly what an operations console exists to surface, and a dashboard that showed totals while
 * hiding them would be decoration.
 */
function AttentionStrip({ statistics }: { statistics: PlatformStatistics }) {
  const { t } = useTranslation()
  const items = attentionItems(statistics)

  return (
    <section aria-labelledby="admin-attention" className="flex flex-col gap-3">
      <h2 id="admin-attention" className="text-sm font-semibold text-foreground">
        {t('admin:dashboard.needsAttention')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const body = (
            <Card padding="md" interactive={item.to !== null} className="flex h-full flex-col gap-3">
              {/* Label above rather than beside the badge: "Escalated verification cases" is a long
                  phrase in English and longer in Somali, and a truncated operational label is worse
                  than a taller card. */}
              <p className="text-sm text-foreground-secondary">{t(`admin:dashboard.${item.id}`)}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <p className="text-2xl font-bold leading-none text-brand-navy dark:text-foreground">
                  {formatNumber(item.value)}
                </p>
                <StatusBadge tone={item.tone}>
                  {item.informational
                    ? t('admin:dashboard.monitoring')
                    : item.value === 0
                      ? t('admin:dashboard.clear')
                      : t('admin:dashboard.needsAction')}
                </StatusBadge>
              </div>
            </Card>
          )
          return item.to ? (
            <Link key={item.id} to={item.to} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              {body}
            </Link>
          ) : (
            <div key={item.id}>{body}</div>
          )
        })}
      </div>
    </section>
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
function ActivityPanel({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [eventType, setEventType] = useState<string | null>(null)

  const typesQuery = useQuery({
    queryKey: ['admin', 'audit', 'types'],
    queryFn: adminApi.listAuditEventTypes,
  })

  const types = typesQuery.data ?? []
  // The list arrives alphabetically, so types[0] is whatever sorts first — ACCOUNT_SUSPENDED on a
  // real trail, which is the rarest event and a useless default. Prefer an event that actually
  // tracks platform activity, and fall back to the alphabetical first only if none are recorded.
  const selected = eventType ?? PREFERRED_EVENT_TYPES.find((type) => types.includes(type)) ?? types[0] ?? null
  const activity = usePlatformActivity(selected, types.length > 0)

  return (
    <Card padding="lg" className={className}>
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
          <LoadingState label={t('common:status.loading')} />
        ) : types.length === 0 ? (
          <p className="py-10 text-center text-sm text-foreground-secondary">
            {t('admin:dashboard.activity.empty')}
          </p>
        ) : activity.allFailed ? (
          // Every month failed. Plotting `count ?? 0` here would draw a flat line along zero, which
          // reads as "nothing happened all year" — a fabricated fact rather than a missing one.
          <ErrorState
            title={t('common:status.error')}
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

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'recent'],
    queryFn: () => adminApi.searchUsers({ page: 0 }),
  })

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
        <LoadingState label={t('common:status.loading')} />
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
