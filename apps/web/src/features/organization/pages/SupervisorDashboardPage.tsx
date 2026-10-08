import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../../placements/api/placementsApi'
import { usePlacementRecords } from '../../placements/hooks/usePlacementRecords'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { evaluationOutstanding, supervisedInterns, unsettledAttendance } from '../supervisorMetrics'
import { supervisorAttention } from '../organizationAttention'
import { OrganizationAttentionQueue, WorkspaceMetrics } from '../components/workspace/OrganizationWorkspace'
import { Alert, ErrorState, PageHeader, Panel, SkeletonList, StatusBadge } from '../../../components/ui'
import { PLACEMENT_STATUS_TONE } from '../../../lib/status/statusTones'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

/**
 * The organization supervisor's workspace (Phase 6) — their interns and what is waiting on them,
 * nothing else. No recruiting metrics, no "create internship", no staff: a supervisor has no
 * recruiting authority (CandidacyAuthorization.RECRUITING_ROLES), and their placement list is
 * already narrowed server-side to their own active assignments.
 *
 * <p>The attention counts come from each assigned placement's attendance and evaluation, read with
 * the same keys the attendance and evaluation pages use. The header renders at once; a placement
 * list failure is an inline error, and an unreadable record makes the totals partial, never wrong.
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
  const attendance = usePlacementRecords(placements, 'attendance', placementsQuery.isSuccess)
  const evaluations = usePlacementRecords(placements, 'evaluation', placementsQuery.isSuccess)
  const recordsReady = placementsQuery.isSuccess && !attendance.isLoading && !evaluations.isLoading

  const interns = supervisedInterns(placements)
  const attendanceByPlacement = new Map(attendance.rows.map((row) => [row.placement.id, unsettledAttendance(row.data ?? []).length]))
  const evaluationByPlacement = new Map(evaluations.rows.map((row) => [row.placement.id, row]))

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader title={t('organization:supervisorDashboard.title')} description={t('organization:supervisorDashboard.subtitle')} />

      {placementsQuery.isError ? (
        <ErrorState variant="inline" onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : recordsReady ? (
        <OrganizationAttentionQueue
          supervisor
          items={supervisorAttention({
            attendance: attendance.rows.map((row) => row.data),
            evaluations: evaluations.rows.map((row) => ({ loaded: !row.isError && row.data !== undefined, data: row.data })),
          })}
        />
      ) : (
        <SkeletonList rows={2} />
      )}

      <WorkspaceMetrics
        metrics={[
          { id: 'assigned', label: t('organization:workspace.metrics.assignedInterns'), value: placementsQuery.isSuccess ? interns.length : undefined, to: '/organization/placements' },
          { id: 'running', label: t('organization:workspace.metrics.runningNow'), value: placementsQuery.isSuccess ? interns.filter((intern) => intern.running).length : undefined, to: '/organization/placements' },
        ]}
      />

      {(attendance.hasErrors || evaluations.hasErrors) && <Alert tone="warning">{t('organization:workspace.work.partialError')}</Alert>}

      <Panel title={t('organization:workspace.work.internsTitle')} padding={!placementsQuery.isSuccess || interns.length === 0 ? 'default' : 'none'}>
        {placementsQuery.isLoading ? (
          <SkeletonList rows={3} />
        ) : interns.length === 0 ? (
          <p className="max-w-prose text-body text-foreground-secondary">{t('organization:workspace.work.internsEmpty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {interns.map((intern) => {
              const waiting = attendanceByPlacement.get(intern.placement.id) ?? 0
              const evaluation = evaluationByPlacement.get(intern.placement.id)
              const evaluationDue = !!evaluation && !evaluation.isError && evaluation.data !== undefined && evaluationOutstanding(evaluation.data)
              return (
                <li key={intern.placement.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/organization/placements/${intern.placement.id}`}
                      className="block break-words rounded-sm text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      {intern.fullName ?? intern.email ?? intern.studentUserId}
                    </Link>
                    <p className="mt-0.5 break-words text-caption text-foreground-secondary">
                      {[intern.universityName, intern.placement.opportunityTitle].filter(Boolean).join(' · ')} ·{' '}
                      {t('placements:detail.dateRange', { start: formatDate(intern.placement.startDate), end: formatDate(intern.placement.endDate) })}
                    </p>
                    {intern.running && recordsReady && (
                      <p className={waiting > 0 || evaluationDue ? 'mt-1 text-caption font-semibold text-warning' : 'mt-1 text-caption text-foreground-secondary'}>
                        {[
                          waiting > 0 ? t('organization:workspace.work.internAttendance', { count: waiting }) : null,
                          evaluationDue ? t('organization:workspace.work.internEvaluation') : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || t('organization:workspace.work.internClear')}
                      </p>
                    )}
                  </div>
                  <StatusBadge tone={PLACEMENT_STATUS_TONE[intern.placement.status]}>{t(`placements:statusValues.${intern.placement.status}`)}</StatusBadge>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </PageContainer>
  )
}
