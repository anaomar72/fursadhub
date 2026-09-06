import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../../placements/api/placementsApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { usePlacementRecords } from '../../placements/hooks/usePlacementRecords'
import {
  evaluationOutstanding,
  evaluationRatingsComplete,
  supervisedInterns,
  unsettledAttendance,
} from '../supervisorMetrics'
import { PLACEMENT_STATUS_TONE } from '../../placements/components/statusTone'
import {
  Alert,
  Card,
  DashboardActionCard,
  Icon,
  LoadingState,
  StatusBadge,
  StatusDistribution,
  type IconName,
} from '../../../components/ui'
import { METRIC_TONES } from '../../../components/ui/metricTones'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

const PANEL_LIMIT = 5

/**
 * The home screen for an {@code ORGANIZATION_SUPERVISOR}.
 *
 * <p>Not the admin or recruiter dashboard with tiles switched off — a different dashboard, because
 * this role's scope is different in kind. An admin or recruiter sees the whole organization; a
 * supervisor reaches a placement ONLY through an active assignment on that specific placement
 * ({@code PlacementAuthorization}: "holding the role grants nothing on its own"). Rendering the
 * organization dashboard here would have shown "Active internships: 0" and "Applications: 0" —
 * zeros that look like facts but are really just endpoints this role cannot read.
 *
 * <p>What a supervisor actually has is {@code GET /organizations/{id}/placements}, narrowed by
 * {@code PlacementQueryService} to their own assignments, plus the WORKPLACE records on each of
 * those: attendance and the evaluation. Weekly logs, the final report and the defense are
 * deliberately absent — {@code requireAcademicReadAccess} admits the owning student and university
 * staff only, so this role cannot read them at all and no amount of UI would change that.
 *
 * <p>Layout, spacing, card treatment and status language follow the approved organization design
 * (11_organization_dashboard_clean.png) and reuse the same shared components as the admin and
 * recruiter dashboards, so all three read as one product.
 */
export function SupervisorDashboardPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()

  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(organizationId),
    retry: false,
  })

  const placements = placementsQuery.data ?? []
  const ready = !placementsQuery.isLoading

  // Only the two sections this role is entitled to read. Fanned out once the placement list is in.
  const attendance = usePlacementRecords(placements, 'attendance', ready)
  const evaluations = usePlacementRecords(placements, 'evaluation', ready)

  if (placementsQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const interns = supervisedInterns(placements)
  const running = interns.filter((intern) => intern.running)

  const attendanceNeedingAction = attendance.rows.reduce(
    (sum, row) => sum + unsettledAttendance(row.data ?? []).length,
    0,
  )
  const evaluationsDue = evaluations.rows.filter((row) => evaluationOutstanding(row.data)).length
  const loading = attendance.isLoading || evaluations.isLoading

  const statusCounts = placements.reduce<Record<string, number>>((counts, placement) => {
    counts[placement.status] = (counts[placement.status] ?? 0) + 1
    return counts
  }, {})
  const statuses = Object.keys(statusCounts) as (keyof typeof PLACEMENT_STATUS_TONE)[]

  return (
    <PageContainer className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-navy dark:text-foreground sm:text-3xl">
          {t('organization:supervisorDashboard.title')}
        </h1>
        <p className="mt-1.5 text-sm text-foreground-secondary">{t('organization:supervisorDashboard.subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="users"
          tone="brand"
          label={t('organization:supervisorDashboard.assignedInterns')}
          value={interns.length}
          to="/organization/placements"
        />
        <MetricCard
          icon="badgeCheck"
          tone="teal"
          label={t('organization:supervisorDashboard.runningNow')}
          value={running.length}
          to="/organization/placements"
        />
        <MetricCard
          icon="clipboard"
          tone="amber"
          label={t('organization:supervisorDashboard.attendanceToSettle')}
          value={loading ? '—' : attendanceNeedingAction}
          to="/organization/supervision"
        />
        <MetricCard
          icon="userCheck"
          tone="violet"
          label={t('organization:supervisorDashboard.evaluationsDue')}
          value={loading ? '—' : evaluationsDue}
          to="/organization/supervision?section=evaluation"
        />
      </div>

      {(attendance.hasErrors || evaluations.hasErrors) && (
        <Alert tone="warning">{t('organization:supervisorDashboard.partialError')}</Alert>
      )}

      {!loading && (attendanceNeedingAction > 0 || evaluationsDue > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardActionCard
            label={t('organization:supervisorDashboard.attendanceToSettle')}
            value={attendanceNeedingAction}
            to="/organization/supervision"
            statusLabel={
              attendanceNeedingAction > 0
                ? t('organization:dashboard.needsAction')
                : t('organization:dashboard.clear')
            }
            tone={attendanceNeedingAction > 0 ? 'warning' : 'success'}
          />
          <DashboardActionCard
            label={t('organization:supervisorDashboard.evaluationsDue')}
            value={evaluationsDue}
            to="/organization/supervision?section=evaluation"
            statusLabel={
              evaluationsDue > 0 ? t('organization:dashboard.needsAction') : t('organization:dashboard.clear')
            }
            tone={evaluationsDue > 0 ? 'warning' : 'success'}
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
              {t('organization:supervisorDashboard.currentInterns')}
            </h2>
            <Link to="/organization/placements" className="shrink-0 text-sm font-semibold text-link hover:underline">
              {t('organization:dashboard.viewAll')}
            </Link>
          </div>
          {running.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
              {t('organization:supervisorDashboard.noCurrentInterns')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {running.slice(0, PANEL_LIMIT).map((intern) => {
                const evaluation = evaluations.rows.find((row) => row.placement.id === intern.placement.id)?.data
                return (
                  <li key={intern.placement.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                      <Icon name="user" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link
                        to={`/organization/placements/${intern.placement.id}`}
                        className="block truncate text-sm font-semibold text-foreground hover:underline"
                      >
                        {intern.fullName ?? intern.email ?? intern.studentUserId}
                      </Link>
                      <span className="block truncate text-xs text-muted">
                        {intern.universityName ?? ''} ·{' '}
                        {t('placements:detail.dateRange', {
                          start: formatDate(intern.placement.startDate),
                          end: formatDate(intern.placement.endDate),
                        })}
                      </span>
                    </span>
                    {!loading && (
                      <StatusBadge tone={evaluationOutstanding(evaluation) ? 'warning' : 'success'}>
                        {evaluation
                          ? t(`internship:evaluation.stateValues.${evaluation.state}`)
                          : t('organization:supervisorDashboard.evaluationNotStarted')}
                      </StatusBadge>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('organization:supervisorDashboard.placementOverview')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            {t('organization:supervisorDashboard.placementOverviewHint')}
          </p>
          <StatusDistribution
            className="mt-5"
            label={t('organization:supervisorDashboard.placementOverview')}
            emptyLabel={t('organization:supervisorDashboard.noPlacements')}
            items={statuses.map((status) => ({
              id: status,
              label: t(`placements:statusValues.${status}`),
              value: statusCounts[status],
              tone: PLACEMENT_STATUS_TONE[status],
            }))}
          />

          {!loading && running.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t('organization:supervisorDashboard.evaluationProgress')}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {running.slice(0, PANEL_LIMIT).map((intern) => {
                  const evaluation = evaluations.rows.find((row) => row.placement.id === intern.placement.id)?.data
                  return (
                    <li key={intern.placement.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-foreground-secondary">
                        {intern.fullName ?? intern.email ?? intern.studentUserId}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {t('organization:supervisorDashboard.ratingsComplete', {
                          done: evaluationRatingsComplete(evaluation),
                          total: 6,
                        })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}

/** The same tile every other FursadHub dashboard uses — one product, one dashboard language. */
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
        {t('organization:dashboard.viewAll')}
      </Link>
    </Card>
  )
}
