import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner, StatusIndicator } from '../../../components/ui'
import * as adminApi from '../api/adminApi'

/**
 * Platform operational statistics (Phase 7 "Admin: platform operational statistics").
 *
 * <p>Counts only — nothing on this page identifies a person or exposes a record. It is the health of
 * the platform, not a window into its users.
 */
export function AdminDashboardPage() {
  const { t } = useTranslation()
  const statisticsQuery = useQuery({
    queryKey: ['admin', 'statistics'],
    queryFn: adminApi.getStatistics,
  })

  if (statisticsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!statisticsQuery.data) {
    return <p className="text-sm text-foreground-secondary">{t('admin:dashboard.unavailable')}</p>
  }

  const statistics = statisticsQuery.data
  const total = (counts: Record<string, number>) =>
    Object.values(counts).reduce((sum, value) => sum + value, 0)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">{t('admin:dashboard.title')}</h1>

      <section aria-labelledby="admin-attention" className="flex flex-col gap-3">
        <h2 id="admin-attention" className="text-sm font-medium text-foreground-secondary">
          {t('admin:dashboard.needsAttention')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AttentionTile
            label={t('admin:dashboard.openPrivacyRequests')}
            value={statistics.openPrivacyRequests}
          />
          <AttentionTile
            label={t('admin:dashboard.escalatedCases')}
            value={statistics.escalatedVerificationCases}
          />
          <AttentionTile
            label={t('admin:dashboard.failedEmails')}
            value={statistics.failedEmailDeliveries}
          />
          <AttentionTile
            label={t('admin:dashboard.recentLoginFailures')}
            value={statistics.recentLoginFailures}
          />
        </div>
      </section>

      <section aria-labelledby="admin-totals" className="flex flex-col gap-3">
        <h2 id="admin-totals" className="text-sm font-medium text-foreground-secondary">
          {t('admin:dashboard.platform')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BreakdownCard
            title={t('admin:dashboard.accounts')}
            total={total(statistics.usersByStatus)}
            counts={statistics.usersByStatus}
          />
          <BreakdownCard
            title={t('admin:dashboard.organizations')}
            total={total(statistics.organizationsByVerificationStatus)}
            counts={statistics.organizationsByVerificationStatus}
          />
          <BreakdownCard
            title={t('admin:dashboard.placements')}
            total={total(statistics.placementsByStatus)}
            counts={statistics.placementsByStatus}
          />
          <BreakdownCard
            title={t('admin:dashboard.opportunities')}
            total={total(statistics.opportunitiesByStatus)}
            counts={statistics.opportunitiesByStatus}
          />
          <SimpleCard title={t('admin:dashboard.universities')} value={statistics.universities} />
          <SimpleCard title={t('admin:dashboard.candidacies')} value={statistics.candidacies} />
        </div>
      </section>
    </div>
  )
}

/**
 * A count that means work is waiting.
 *
 * <p>Non-zero is marked with a warning indicator AND the words "needs attention" — never by colour
 * alone (BRAND_AND_UI_GUIDELINES.md accessibility).
 */
function AttentionTile({ label, value }: { label: string; value: number }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-foreground-secondary">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <StatusIndicator
        tone={value > 0 ? 'warning' : 'success'}
        label={value > 0 ? t('admin:dashboard.needsAction') : t('admin:dashboard.clear')}
      />
    </div>
  )
}

function BreakdownCard({
  title,
  total,
  counts,
}: {
  title: string
  total: number
  counts: Record<string, number>
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xl font-semibold text-foreground">{total}</span>
      </div>
      <dl className="flex flex-col gap-1">
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-2 text-sm">
            {/* Status names come from the frozen enums; a code with no translation shows as-is. */}
            <dt className="text-foreground-secondary">{t(`admin:statusLabels.${key}`, key)}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SimpleCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
