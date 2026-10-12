import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { AttentionQueue, Panel, SkeletonList, type AttentionQueueItem } from '../../../components/ui'
import * as attendanceApi from '../../attendance/api/attendanceApi'
import * as evaluationsApi from '../../evaluations/api/evaluationsApi'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { organizationCapabilities } from '../../organization/organizationCapabilities'
import { disputedAttendance, evaluationOutstanding } from '../../organization/supervisorMetrics'
import { studentQueries } from '../../student/studentQueries'
import { PlacementLifecycle } from '../../student/components/journey/PlacementLifecycle'
import { PlacementLifecycleActions } from '../components/PlacementLifecycleActions'
import { SupervisorPanel } from '../components/SupervisorPanel'
import { SupervisorHistory } from '../components/SupervisorHistory'
import type { PlacementResponse } from '../types'

/**
 * The host organization's overview of ONE placement (Phase 6) — supervision first.
 *
 * <p>What needs doing on this internship, where it stands (the same lifecycle tracker the student
 * sees, driven by the same backend completion checklist, but in staff wording and linking only to
 * the records the organization can open), the lifecycle commands for the roles that run it, and who
 * supervises it. The university's view of a placement is its own page (UniversityPlacementOverview).
 *
 * <p>Authority mirrors the backend: only the assigned organization supervisor confirms or resolves
 * attendance and writes the evaluation (AttendanceService / PlacementEvaluationService lock for the
 * supervisor), so for an admin or recruiter those items are information about the supervisor's
 * queue, not actions of their own. Only admins and recruiters run the lifecycle and assign the
 * organization supervisor (PlacementAuthorization).
 */
export function OrganizationPlacementOverview() {
  const { t } = useTranslation()
  const placement = useOutletContext<PlacementResponse>()
  const membership = useOrganizationMembership()
  const can = organizationCapabilities(membership)
  const supervises = can.scopedToAssignedPlacements
  const running = placement.status === 'ACTIVE' || placement.status === 'COMPLETION_PENDING'
  const base = `/organization/placements/${placement.id}`

  const completionQuery = useQuery(studentQueries.completion(placement.id))
  // The same keys the attendance and evaluation pages use, so opening either next is instant.
  const attendanceQuery = useQuery({
    queryKey: ['attendance', placement.id],
    queryFn: () => attendanceApi.listAttendance(placement.id),
    enabled: running,
    retry: false,
  })
  const evaluationQuery = useQuery({
    queryKey: ['evaluation', placement.id],
    queryFn: () => evaluationsApi.getEvaluation(placement.id),
    enabled: running,
    retry: false,
  })

  const k = 'organization:workspace.attention.items'
  const items: AttentionQueueItem[] = []
  const records = attendanceQuery.data ?? []
  const disputed = disputedAttendance(records).length
  const toConfirm = records.filter((record) => record.confirmationStatus === 'RECORDED').length
  const tone = supervises ? 'action' : 'info'
  if (disputed > 0) {
    items.push({ id: 'disputed', count: disputed, tone, title: t(`${k}.attendanceDisputed.title`, { count: disputed }), action: { label: t(`${k}.attendanceDisputed.action`), to: `${base}/attendance` } })
  }
  if (toConfirm > 0) {
    items.push({ id: 'toConfirm', count: toConfirm, tone, title: t(`${k}.attendanceToConfirm.title`, { count: toConfirm }), action: { label: t(`${k}.attendanceToConfirm.action`), to: `${base}/attendance` } })
  }
  if (running && evaluationQuery.isSuccess && evaluationOutstanding(evaluationQuery.data)) {
    items.push({ id: 'evaluation', count: 1, tone, title: t(`${k}.evaluationsDue.title`, { count: 1 }), action: { label: t(`${k}.evaluationsDue.action`), to: `${base}/evaluation` } })
  }
  if (can.canManagePlacementLifecycle && !placement.organizationSupervisor && placement.status !== 'CANCELLED' && placement.status !== 'TERMINATED' && placement.status !== 'COMPLETED') {
    items.push({ id: 'supervisor', count: 1, title: t(`${k}.placementsWithoutSupervisor.title`, { count: 1 }), action: { label: t(`${k}.placementsWithoutSupervisor.action`), to: '#organization-supervisor' } })
  }
  const attentionLoading = running && (attendanceQuery.isLoading || evaluationQuery.isLoading)

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="flex min-w-0 flex-col gap-8">
        {attentionLoading ? (
          <SkeletonList rows={2} />
        ) : (
          <AttentionQueue
            title={t('organization:workspace.attention.title')}
            clearTitle={t('organization:workspace.attention.clearTitle')}
            clearBody={t('organization:workspace.attention.supervisorClearBody')}
            items={items}
          />
        )}

        <Panel title={t('organization:workspace.lifecycle.title')}>
          {completionQuery.isLoading ? (
            <SkeletonList rows={4} />
          ) : (
            <PlacementLifecycle
              placement={placement}
              signals={{ completion: completionQuery.data }}
              completionUnavailable={completionQuery.isError}
              audience="organization"
              linkModules
            />
          )}
        </Panel>

        {can.canManagePlacementLifecycle && <PlacementLifecycleActions placement={placement} />}
      </div>

      <aside className="flex min-w-0 flex-col gap-6" aria-label={t('placements:supervisors.title')}>
        <div id="organization-supervisor">
          <SupervisorPanel placement={placement} type="ORGANIZATION" canAssign={can.canManagePlacementLifecycle} />
        </div>
        <SupervisorPanel placement={placement} type="UNIVERSITY" canAssign={false} />
        <SupervisorHistory placementId={placement.id} />
      </aside>
    </div>
  )
}
