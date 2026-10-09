import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Alert, Icon, Panel, SkeletonList, StatusBadge } from '../../../components/ui'
import * as evaluationsApi from '../../evaluations/api/evaluationsApi'
import * as weeklyLogsApi from '../../weekly-logs/api/weeklyLogsApi'
import * as attendanceApi from '../../attendance/api/attendanceApi'
import * as defenseApi from '../../defense/api/defenseApi'
import { EVALUATION_RATING_FIELDS } from '../../evaluations/types'
import { formatDate } from '../../../lib/utils/formatDate'
import { studentQueries } from '../../student/studentQueries'
import { placementAttention } from '../../student/studentJourney'
import { AttentionList } from '../../student/components/journey/AttentionList'
import { PlacementLifecycle } from '../../student/components/journey/PlacementLifecycle'
import type { PlacementResponse } from '../types'

/**
 * The student's internship hub — the overview of ONE placement.
 *
 * <p>It orients and routes rather than duplicating the module pages: what needs the student now,
 * where the internship stands (the lifecycle tracker, with each requirement linking to its own
 * page), who is involved, and — once it is final — the organization's evaluation. Read-only for
 * the student: the host organization drives the lifecycle and the university decides completion.
 *
 * <p>Every reading comes from the backend: the completion checklist decides which requirements
 * exist at all, and the module lists are fetched only when this placement's policy requires that
 * module — under the same query keys their pages use, so opening a module next is instant.
 */
export function StudentPlacementDetailPage() {
  const { t } = useTranslation()
  const placement = useOutletContext<PlacementResponse>()
  const running = placement.status === 'ACTIVE' || placement.status === 'COMPLETION_PENDING'

  const completionQuery = useQuery(studentQueries.completion(placement.id))
  const requires = (type: string) => !!completionQuery.data?.requirements.some((r) => r.type === type && r.required)

  const weeklyLogsQuery = useQuery({
    queryKey: ['weekly-logs', placement.id],
    queryFn: () => weeklyLogsApi.listWeeklyLogs(placement.id),
    enabled: running && requires('WEEKLY_LOGS'),
  })
  const attendanceQuery = useQuery({
    queryKey: ['attendance', placement.id],
    queryFn: () => attendanceApi.listAttendance(placement.id),
    enabled: running && requires('ATTENDANCE'),
  })
  const defenseQuery = useQuery({
    queryKey: ['defense-attempts', placement.id],
    queryFn: () => defenseApi.listDefenseAttempts(placement.id),
    enabled: requires('DEFENSE'),
  })
  // The backend returns the evaluation to the student only once it is FINAL; anything else is a
  // refusal, which is shown as "not available yet", never as an error.
  const evaluationQuery = useQuery({
    queryKey: ['evaluation', placement.id],
    queryFn: () => evaluationsApi.getEvaluation(placement.id),
    retry: false,
  })

  const signals = {
    completion: completionQuery.data,
    weeklyLogs: weeklyLogsQuery.data,
    attendance: attendanceQuery.data,
    defenseAttempts: defenseQuery.data,
  }
  const evaluation = evaluationQuery.data ?? null

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="flex min-w-0 flex-col gap-8">
        {completionQuery.isLoading ? <SkeletonList rows={2} /> : <AttentionList items={placementAttention(placement, signals)} />}

        <Panel title={t('student:journey.lifecycle.title')}>
          {completionQuery.isLoading ? (
            <SkeletonList rows={4} />
          ) : (
            <PlacementLifecycle placement={placement} signals={signals} completionUnavailable={completionQuery.isError} linkModules />
          )}
        </Panel>

        <Panel
          title={t('internship:evaluation.title')}
          description={t('placements:detail.evaluationHint')}
          action={evaluation ? <StatusBadge tone="success">{t(`internship:evaluation.stateValues.${evaluation.state}`)}</StatusBadge> : undefined}
        >
          {evaluation ? (
            <>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {EVALUATION_RATING_FIELDS.map((field) => (
                  <Rating key={field} label={t(`internship:evaluation.fields.${field}`)} value={evaluation[field]} />
                ))}
              </dl>
              <dl className="mt-5 flex flex-col gap-4 border-t border-border pt-5 text-body">
                {evaluation.strengths && <Prose label={t('internship:evaluation.fields.strengths')} body={evaluation.strengths} />}
                {evaluation.improvementAreas && <Prose label={t('internship:evaluation.fields.improvementAreas')} body={evaluation.improvementAreas} />}
                {evaluation.finalComments && <Prose label={t('internship:evaluation.fields.finalComments')} body={evaluation.finalComments} />}
              </dl>
            </>
          ) : evaluationQuery.isLoading ? (
            <SkeletonList rows={1} />
          ) : evaluationQuery.isError && !isRefusal(evaluationQuery.error) ? (
            <Alert tone="warning">{t('placements:detail.evaluationUnavailable')}</Alert>
          ) : (
            <p className="text-body text-foreground-secondary">{t('internship:evaluation.notAvailable')}</p>
          )}
        </Panel>
      </div>

      <aside className="flex min-w-0 flex-col gap-8" aria-label={t('placements:detail.aboutTitle')}>
        <Panel title={t('placements:detail.aboutTitle')} padding="compact">
          <dl className="flex flex-col gap-3 text-body">
            <Row label={t('placements:detail.organization')} value={placement.organizationName} />
            <Row label={t('placements:detail.university')} value={placement.universityName} />
            <Row label={t('placements:detail.department')} value={placement.departmentName} />
            <Row
              label={t('placements:detail.dates')}
              value={t('placements:detail.dateRange', { start: formatDate(placement.startDate), end: formatDate(placement.endDate) })}
            />
            {placement.location && <Row label={t('placements:detail.location')} value={placement.location} />}
          </dl>
        </Panel>

        <Panel title={t('placements:supervisors.title')} padding="compact">
          <ul className="flex flex-col gap-4">
            <SupervisorRow label={t('placements:supervisors.universitySupervisor')} email={placement.universitySupervisor?.supervisorEmail ?? null} />
            <SupervisorRow label={t('placements:supervisors.organizationSupervisor')} email={placement.organizationSupervisor?.supervisorEmail ?? null} />
          </ul>
        </Panel>
      </aside>
    </div>
  )
}

/** 403/404 from the evaluation read mean "not final yet / not shared with you" — not a failure. */
function isRefusal(error: unknown): boolean {
  const status = (error as { body?: { status?: number } } | null)?.body?.status
  return status === 403 || status === 404
}

function Row({ label, value }: { label: string; value: string | null }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0">
      <dt className="text-caption text-foreground-secondary">{label}</dt>
      <dd className="mt-0.5 break-words font-semibold text-foreground">{value ?? t('common:status.notProvided')}</dd>
    </div>
  )
}

function SupervisorRow({ label, email }: { label: string; email: string | null }) {
  const { t } = useTranslation()
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={
          email
            ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-info-bg text-info'
            : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted'
        }
      >
        <Icon name="user" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-caption text-foreground-secondary">{label}</span>
        <span className="block break-all text-body font-semibold text-foreground">{email ?? t('placements:supervisors.unassigned')}</span>
      </span>
    </li>
  )
}

function Rating({ label, value }: { label: string; value: number | null }) {
  const { t } = useTranslation()
  return (
    <div>
      <dt className="text-caption text-foreground-secondary">{label}</dt>
      <dd className="mt-1 font-display text-title-panel text-foreground">
        {value === null ? t('internship:evaluation.notRated') : t('internship:evaluation.ratingOf', { value })}
      </dd>
    </div>
  )
}

function Prose({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="mt-1 whitespace-pre-line break-words text-foreground">{body}</dd>
    </div>
  )
}
