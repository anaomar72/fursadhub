import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { AttentionQueue, Panel, SkeletonList, type AttentionQueueItem } from '../../../components/ui'
import * as attendanceApi from '../../attendance/api/attendanceApi'
import * as defenseApi from '../../defense/api/defenseApi'
import * as finalReportsApi from '../../final-reports/api/finalReportsApi'
import * as weeklyLogsApi from '../../weekly-logs/api/weeklyLogsApi'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { universityCapabilities } from '../../university/universityCapabilities'
import { disputedAttendance, logsAwaitingReview, reportAwaitingReview } from '../../university/supervisionMetrics'
import { studentQueries } from '../../student/studentQueries'
import { PlacementLifecycle } from '../../student/components/journey/PlacementLifecycle'
import { formatDateTime } from '../../../lib/utils/formatDate'
import { CompletionPanel } from '../components/CompletionPanel'
import { SupervisorPanel } from '../components/SupervisorPanel'
import { SupervisorHistory } from '../components/SupervisorHistory'
import type { PlacementResponse } from '../types'

/**
 * The university's overview of ONE placement (Phase 7) — academic supervision first.
 *
 * <p>What needs the university on this internship, where it stands (the same lifecycle tracker the
 * student and the organization see, driven by the same backend completion checklist, in the
 * university's own wording and linking to all five records), the completion decision, and who
 * supervises it on both sides.
 *
 * <p>Authority mirrors the backend:
 * <ul>
 *   <li>Weekly logs, the final report and the defense are reviewed by any university member with
 *       academic access to this placement ({@code requireUniversityAcademicAccess}) — so for all
 *       three roles those are their own actions.</li>
 *   <li>Attendance is settled by the assigned ORGANIZATION supervisor
 *       ({@code AttendanceService}); a dispute is information here, never a university command.</li>
 *   <li>Completing the internship and assigning the university supervisor belong to admins and
 *       coordinators in scope ({@code requireUniversityCompletionAuthority}) — not supervisors, who
 *       review the work but do not close it.</li>
 * </ul>
 * Every request below uses the key its own module page uses, so opening that page next is instant.
 */
export function UniversityPlacementOverview() {
  const { t } = useTranslation()
  const placement = useOutletContext<PlacementResponse>()
  const can = universityCapabilities(useUniversityMembership())
  const manages = can.canCompletePlacements
  const running = placement.status === 'ACTIVE' || placement.status === 'COMPLETION_PENDING'
  const base = `/university/placements/${placement.id}`

  const completionQuery = useQuery(studentQueries.completion(placement.id))
  const logsQuery = useQuery({ queryKey: ['weekly-logs', placement.id], queryFn: () => weeklyLogsApi.listWeeklyLogs(placement.id), enabled: running, retry: false })
  const reportQuery = useQuery({ queryKey: ['final-report', placement.id], queryFn: () => finalReportsApi.getFinalReport(placement.id), enabled: running, retry: false })
  const defenseQuery = useQuery({ queryKey: ['defense-attempts', placement.id], queryFn: () => defenseApi.listDefenseAttempts(placement.id), enabled: running, retry: false })
  const attendanceQuery = useQuery({ queryKey: ['attendance', placement.id], queryFn: () => attendanceApi.listAttendance(placement.id), enabled: running, retry: false })

  const k = 'university:workspace.placement.attention'
  const items: AttentionQueueItem[] = []

  const logs = logsAwaitingReview(logsQuery.data ?? []).length
  if (logs > 0) items.push({ id: 'logs', count: logs, title: t(`${k}.logs`, { count: logs }), action: { label: t(`${k}.review`), to: `${base}/weekly-logs` } })

  if (reportAwaitingReview(reportQuery.data ?? null)) {
    items.push({ id: 'report', count: 1, title: t(`${k}.report`), action: { label: t(`${k}.review`), to: `${base}/final-report` } })
  }

  const scheduled = (defenseQuery.data ?? []).find((attempt) => attempt.state === 'SCHEDULED')
  const defense = completionQuery.data?.requirements.find((requirement) => requirement.type === 'DEFENSE')
  if (scheduled) {
    items.push({
      id: 'defense',
      tone: 'info',
      title: t(`${k}.defenseScheduled`),
      meta: [formatDateTime(scheduled.scheduledAt), scheduled.locationDetails].filter(Boolean).join(' · '),
      action: { label: t(`${k}.open`), to: `${base}/defense` },
    })
  } else if (running && defenseQuery.isSuccess && defense?.required && !defense.satisfied) {
    items.push({ id: 'defense', title: t(`${k}.defenseToSchedule`), action: { label: t(`${k}.schedule`), to: `${base}/defense` } })
  }

  const disputes = disputedAttendance(attendanceQuery.data ?? []).length
  if (disputes > 0) {
    // Settled by the organization's supervisor; the university only needs to know.
    items.push({ id: 'attendance', tone: 'info', count: disputes, title: t(`${k}.disputes`, { count: disputes }), action: { label: t(`${k}.open`), to: `${base}/attendance` } })
  }

  if (manages && placement.status === 'COMPLETION_PENDING') {
    items.push({ id: 'completion', title: t(`${k}.completion`), action: { label: t(`${k}.decide`), to: '#university-completion' } })
  }
  if (manages && !placement.universitySupervisor && ['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'].includes(placement.status)) {
    items.push({ id: 'supervisor', title: t(`${k}.noSupervisor`), action: { label: t(`${k}.assign`), to: '#university-supervisor' } })
  }

  const attentionLoading = running && [logsQuery, reportQuery, defenseQuery, attendanceQuery].some((query) => query.isLoading)

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="flex min-w-0 flex-col gap-8">
        {attentionLoading ? (
          <SkeletonList rows={2} />
        ) : (
          <AttentionQueue
            title={t('university:workspace.attention.title')}
            clearTitle={t('university:workspace.attention.clearTitle')}
            clearBody={t('university:workspace.placement.clearBody')}
            items={items}
          />
        )}

        <Panel title={t('university:workspace.lifecycle.title')}>
          {completionQuery.isLoading ? (
            <SkeletonList rows={4} />
          ) : (
            <PlacementLifecycle
              placement={placement}
              signals={{ completion: completionQuery.data, defenseAttempts: defenseQuery.data }}
              completionUnavailable={completionQuery.isError}
              audience="university"
              linkModules
            />
          )}
        </Panel>

        {/* The completion checklist for everyone; the decision only for admins and coordinators. */}
        <div id="university-completion" className="scroll-mt-24">
          <CompletionPanel placement={placement} canComplete={manages} />
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-6" aria-label={t('placements:supervisors.title')}>
        <div id="university-supervisor" className="scroll-mt-24">
          <SupervisorPanel placement={placement} type="UNIVERSITY" canAssign={manages} />
        </div>
        <SupervisorPanel placement={placement} type="ORGANIZATION" canAssign={false} />
        <SupervisorHistory placementId={placement.id} />
      </aside>
    </div>
  )
}
