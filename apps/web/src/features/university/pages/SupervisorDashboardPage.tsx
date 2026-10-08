import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, PageHeader } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { useSupervisionRecords } from '../hooks/useSupervisionRecords'
import { universityQueries } from '../universityQueries'
import { supervisionAttention } from '../universityAttention'
import { logsAwaitingReview, reportAwaitingReview, supervisedStudents } from '../supervisionMetrics'
import { CurrentInternsPanel, UniversityAttentionQueue, UniversityMetrics } from '../components/workspace/UniversityWorkspace'

/**
 * The home screen for a {@code UNIVERSITY_SUPERVISOR} (Phase 7): their students, and the academic
 * work waiting on them.
 *
 * <p>A supervisor's whole scope is the placements they are actively assigned to
 * ({@code PlacementQueryService.listForUniversity}), so everything here is counted from that list and
 * from the weekly logs and final report of each running placement — the records they review through
 * {@code requireUniversityAcademicAccess}. None of the institution's coordination endpoints admit
 * them, so none are called: no verification, no departments, no staff (CLAUDE.md section 24).
 *
 * <p>Attendance and the evaluation belong to the host organization's supervisor and are read on
 * each placement's own page rather than fanned out here.
 */
export function SupervisorDashboardPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()

  const placementsQuery = useQuery(universityQueries.placements(universityId))
  const placements = placementsQuery.data ?? []
  const ready = placementsQuery.isSuccess

  // Only fanned out once the placement list is in — there is nothing to ask about before then.
  const logs = useSupervisionRecords(placements, 'weekly-logs', ready)
  const reports = useSupervisionRecords(placements, 'final-report', ready)

  const attention = supervisionAttention({
    logs: logs.rows.map((row) => row.data),
    reports: reports.rows.map((row) => row.data),
  })
  const pendingLogs = (placementId: string) =>
    logsAwaitingReview(logs.rows.find((row) => row.placement.id === placementId)?.data ?? []).length
  const reportPending = (placementId: string) =>
    reportAwaitingReview(reports.rows.find((row) => row.placement.id === placementId)?.data ?? null)

  const recordsLoading = !ready || logs.isLoading || reports.isLoading
  const logCount = attention.find((item) => item.kind === 'logsToReview')?.count ?? 0
  const reportCount = attention.find((item) => item.kind === 'reportsToReview')?.count ?? 0
  const notScanned = Math.max(logs.notScanned, reports.notScanned)

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader title={t('university:supervisorDashboard.title')} description={t('university:supervisorDashboard.subtitle')} />

      <UniversityAttentionQueue
        items={attention}
        clearBody={t('university:workspace.attention.supervisorClearBody')}
        loading={placementsQuery.isLoading || (ready && (logs.isLoading || reports.isLoading))}
        failed={placementsQuery.isError || logs.hasErrors || reports.hasErrors}
        onRetry={() => void placementsQuery.refetch()}
      />

      {notScanned > 0 && <Alert tone="info">{t('university:supervision.scannedPartial', { scanned: logs.totalInScope - notScanned, total: logs.totalInScope })}</Alert>}

      <UniversityMetrics
        metrics={[
          {
            id: 'students',
            label: t('university:supervisorDashboard.assignedStudents'),
            value: placementsQuery.data ? supervisedStudents(placements).length : undefined,
            to: '/university/my-students',
          },
          {
            id: 'logs',
            label: t('university:supervisorDashboard.logsAwaitingReview'),
            value: recordsLoading ? undefined : logCount,
            to: '/university/supervision',
          },
          {
            id: 'reports',
            label: t('university:supervisorDashboard.reportsAwaitingReview'),
            value: recordsLoading ? undefined : reportCount,
            to: '/university/supervision?section=final-report',
          },
        ]}
      />

      <CurrentInternsPanel
        title={t('university:supervisorDashboard.currentStudents')}
        description={t('university:workspace.supervisor.internsDescription')}
        placements={placements}
        loading={placementsQuery.isLoading}
        error={placementsQuery.isError}
        onRetry={() => void placementsQuery.refetch()}
        emptyLabel={t('university:supervisorDashboard.noCurrentStudents')}
        viewAllTo="/university/my-students"
        limit={10}
        detail={(placement) => {
          if (recordsLoading) return null
          const parts = [
            pendingLogs(placement.id) > 0 && t('university:workspace.interns.logsWaiting', { count: pendingLogs(placement.id) }),
            reportPending(placement.id) && t('university:workspace.interns.reportWaiting'),
          ].filter(Boolean)
          return parts.length > 0 ? (
            <span className="mt-0.5 block text-caption font-semibold text-foreground">{parts.join(' · ')}</span>
          ) : null
        }}
      />
    </PageContainer>
  )
}
