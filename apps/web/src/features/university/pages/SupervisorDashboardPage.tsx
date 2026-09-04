import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../../placements/api/placementsApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { useSupervisionRecords } from '../hooks/useSupervisionRecords'
import { logsAwaitingReview, reportAwaitingReview, supervisedStudents } from '../supervisionMetrics'
import { PLACEMENT_STATUS_ORDER, countByPlacementStatus, livePlacementCount } from '../universityMetrics'
import { PLACEMENT_STATUS_TONE } from '../../placements/components/statusTone'
import { Card, DashboardActionCard, ErrorState, Icon, type IconName, LoadingState, StatusBadge, StatusDistribution } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

/**
 * The home screen for a {@code UNIVERSITY_SUPERVISOR}.
 *
 * <p>Not the admin dashboard with tiles removed — a different dashboard, because a supervisor's job
 * is different. The admin view answers "how is my institution doing" from the cohort, the
 * verification queue and the nomination pipeline; none of those endpoints admit a supervisor at all
 * ({@code VerificationQueryService}, {@code NominationQueryService} both require
 * {@code UNIVERSITY_ADMIN}/{@code DEPARTMENT_COORDINATOR}), so calling them here would mean four
 * guaranteed 403s and four zeros presented as facts.
 *
 * <p>What a supervisor actually has is {@code GET /universities/{id}/placements}, which
 * {@code PlacementQueryService.listForUniversity} narrows to their actively assigned placements,
 * plus the internship records on each of those. Every number below is counted from exactly that,
 * so the scope of the page is the scope the backend granted — nothing wider, nothing invented.
 *
 * <p>Layout, spacing, card treatment and status language follow the approved university design
 * (12_university_dashboard_clean.png) and reuse the same shared components as the admin dashboard,
 * so the two read as one product.
 */
export function SupervisorDashboardPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()

  const placementsQuery = useQuery({
    queryKey: ['placements', 'university', universityId],
    queryFn: () => placementsApi.listUniversityPlacements(universityId),
    retry: false,
  })

  const placements = placementsQuery.data ?? []
  const ready = !placementsQuery.isLoading

  // Only fanned out once the placement list is in — there is nothing to ask about before then.
  const logs = useSupervisionRecords(placements, 'weekly-logs', ready)
  const reports = useSupervisionRecords(placements, 'final-report', ready)

  if (placementsQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  if (placementsQuery.isError) {
    return (
      <PageContainer>
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void placementsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      </PageContainer>
    )
  }

  const students = supervisedStudents(placements)
  const statusCounts = countByPlacementStatus(placements)

  const pendingLogs = logs.rows.reduce((sum, row) => sum + logsAwaitingReview(row.data ?? []).length, 0)
  const pendingReports = reports.rows.filter((row) => reportAwaitingReview(row.data ?? null)).length

  // Newest-first, and only the ones actually running: the supervisor's working set.
  const current = students
    .filter((student) => student.currentPlacement !== null)
    .slice(0, 5)

  return (
    <PageContainer className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-navy dark:text-foreground sm:text-3xl">
          {t('university:supervisorDashboard.title')}
        </h1>
        <p className="mt-1.5 text-sm text-foreground-secondary">{t('university:supervisorDashboard.subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="graduationCap"
          tone="brand"
          label={t('university:supervisorDashboard.assignedStudents')}
          value={students.length}
          to="/university/my-students"
        />
        <MetricCard
          icon="badgeCheck"
          tone="teal"
          label={t('university:supervisorDashboard.activePlacements')}
          value={livePlacementCount(placements)}
          to="/university/placements"
        />
        <MetricCard
          icon="clipboard"
          tone="violet"
          label={t('university:supervisorDashboard.logsAwaitingReview')}
          value={logs.isLoading ? '—' : pendingLogs}
          to="/university/supervision"
        />
        <MetricCard
          icon="document"
          tone="amber"
          label={t('university:supervisorDashboard.reportsAwaitingReview')}
          value={reports.isLoading ? '—' : pendingReports}
          to="/university/supervision"
        />
      </div>

      {!logs.isLoading && !reports.isLoading && (pendingLogs > 0 || pendingReports > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardActionCard
            label={t('university:supervisorDashboard.logsAwaitingReview')}
            value={pendingLogs}
            to="/university/supervision"
            statusLabel={pendingLogs > 0 ? t('university:dashboard.needsAction') : t('university:dashboard.clear')}
            tone={pendingLogs > 0 ? 'warning' : 'success'}
          />
          <DashboardActionCard
            label={t('university:supervisorDashboard.reportsAwaitingReview')}
            value={pendingReports}
            to="/university/supervision"
            statusLabel={pendingReports > 0 ? t('university:dashboard.needsAction') : t('university:dashboard.clear')}
            tone={pendingReports > 0 ? 'warning' : 'success'}
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
              {t('university:supervisorDashboard.currentStudents')}
            </h2>
            <Link to="/university/my-students" className="shrink-0 text-sm font-semibold text-link hover:underline">
              {t('university:dashboard.viewAll')}
            </Link>
          </div>
          {current.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
              {t('university:supervisorDashboard.noCurrentStudents')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {current.map((student) => (
                <li key={student.studentUserId} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/university/placements/${student.currentPlacement!.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {student.fullName ?? student.email ?? student.studentUserId}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {student.currentPlacement!.organizationName ?? ''} ·{' '}
                      {t('placements:detail.dateRange', {
                        start: formatDate(student.currentPlacement!.startDate),
                        end: formatDate(student.currentPlacement!.endDate),
                      })}
                    </span>
                  </span>
                  <StatusBadge tone={PLACEMENT_STATUS_TONE[student.currentPlacement!.status]}>
                    {t(`placements:statusValues.${student.currentPlacement!.status}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('university:supervisorDashboard.placementOverview')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            {t('university:supervisorDashboard.placementOverviewHint')}
          </p>
          <StatusDistribution
            className="mt-5"
            label={t('university:supervisorDashboard.placementOverview')}
            emptyLabel={t('university:supervisorDashboard.noPlacements')}
            items={PLACEMENT_STATUS_ORDER.map((status) => ({
              id: status,
              label: t(`placements:statusValues.${status}`),
              value: statusCounts[status],
              tone: PLACEMENT_STATUS_TONE[status],
            }))}
          />
        </Card>
      </div>
    </PageContainer>
  )
}

const METRIC_TONES = {
  brand: 'bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info',
  violet: 'bg-info-bg text-info',
  teal: 'bg-success-bg text-success',
  amber: 'bg-warning-bg text-warning',
} as const

/** The same tile the admin dashboard uses, so both university dashboards read as one product. */
function MetricCard({
  icon,
  tone,
  label,
  value,
  to,
}: {
  icon: IconName
  tone: keyof typeof METRIC_TONES
  label: string
  value: number | string
  to: string
}) {
  const { t } = useTranslation()
  return (
    <Card padding="lg">
      <div className="flex items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${METRIC_TONES[tone]}`}>
          <Icon name={icon} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground-secondary">{label}</p>
          <p className="mt-1 text-3xl font-bold leading-none text-brand-navy dark:text-foreground">{value}</p>
        </div>
      </div>
      <Link to={to} className="mt-4 inline-block text-sm font-semibold text-link hover:underline">
        {t('university:dashboard.viewAll')}
      </Link>
    </Card>
  )
}
