import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import * as placementsApi from '../../placements/api/placementsApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { usePlacementRecords, type PlacementRecords } from '../../placements/hooks/usePlacementRecords'
import {
  disputedAttendance,
  evaluationOutstanding,
  evaluationRatingsComplete,
  unsettledAttendance,
} from '../supervisorMetrics'
import {
  Alert,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  Tabs,
  type StatusTone,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import type { EvaluationState } from '../../evaluations/types'
import type { PlacementResponse } from '../../placements/types'

const EVALUATION_STATE_TONE: Record<EvaluationState, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  FINAL: 'success',
}

const SECTIONS = ['attendance', 'evaluation'] as const
type Section = (typeof SECTIONS)[number]

/**
 * Everything on the interns this supervisor is assigned to that is waiting on them, gathered into
 * one screen instead of asking them to open each placement to find out.
 *
 * <p>Exactly two sections, because exactly two are this role's:
 * {@code AttendanceService.record/confirm/resolve} and
 * {@code PlacementEvaluationService.saveDraft/submit/finalize} both require
 * {@code requireAssignedOrganizationSupervisorOnRunningPlacement}. Weekly logs, the final report
 * and the defense have no tab here because {@code requireAcademicReadAccess} excludes organization
 * staff entirely — a tab for them would be a tab of 403s.
 *
 * <p>Access comes entirely from the placement list the API returned, already narrowed by
 * {@code PlacementQueryService} to this supervisor's ACTIVE assignments. This page never asks about
 * a placement outside it, and every per-placement request is re-authorized regardless, so it is a
 * convenience over the same boundary rather than a way around it (CLAUDE.md section 24).
 */
export function SupervisionQueuePage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()

  // The open section lives in the URL so the dashboard can link straight at the evaluations tab.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('section')
  const section: Section = requested === 'evaluation' ? 'evaluation' : 'attendance'
  const setSection = (next: Section) => {
    setSearchParams(
      (params) => {
        if (next === 'attendance') params.delete('section')
        else params.set('section', next)
        return params
      },
      { replace: true },
    )
  }

  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(organizationId),
  })

  const placements = placementsQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('organization:supervision.eyebrow')}
        title={t('organization:supervision.title')}
        description={t('organization:supervision.subtitle')}
      />

      <Tabs
        label={t('organization:supervision.tabsLabel')}
        value={section}
        onValueChange={(value) => setSection(value as Section)}
        items={SECTIONS.map((id) => ({ id, label: t(`organization:supervision.tabs.${id}`) }))}
      />

      {placementsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : placementsQuery.isError ? (
        <ErrorState onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : section === 'attendance' ? (
        <AttendanceQueue placements={placements} />
      ) : (
        <EvaluationQueue placements={placements} />
      )}
    </PageContainer>
  )
}

/** The chrome every section shares: how much was scanned, whether anything failed, and the list. */
function QueueChrome({
  records,
  children,
}: {
  records: Pick<PlacementRecords<'attendance'>, 'isLoading' | 'hasErrors' | 'notScanned' | 'totalInScope'> & {
    scannedCount: number
  }
  children: ReactNode
}) {
  const { t } = useTranslation()

  if (records.totalInScope === 0) {
    return (
      <EmptyState
        title={t('organization:supervision.noRunningPlacements')}
        description={t('organization:supervision.noRunningPlacementsHint')}
      />
    )
  }

  if (records.isLoading) {
    return <LoadingState label={t('common:status.loading')} />
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground-secondary" aria-live="polite">
        {records.notScanned > 0
          ? t('organization:supervision.scannedPartial', {
              scanned: records.scannedCount,
              total: records.totalInScope,
            })
          : t('organization:supervision.scanned', { count: records.totalInScope })}
      </p>

      {records.hasErrors && <Alert tone="warning">{t('organization:supervision.partialError')}</Alert>}

      {children}
    </div>
  )
}

/** One row shape for both sections, so an intern reads identically in either. */
function QueueRow({
  placement,
  to,
  headline,
  detail,
  badge,
}: {
  placement: PlacementResponse
  to: string
  headline: string
  detail: string
  badge: ReactNode
}) {
  const { t } = useTranslation()
  const context = [placement.universityName, placement.opportunityTitle].filter(Boolean).join(' · ')
  const trailing =
    detail ||
    t('placements:detail.dateRange', { start: formatDate(placement.startDate), end: formatDate(placement.endDate) })

  return (
    <li>
      <Card interactive padding="lg" className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">
              <Link to={to} className="focus-visible:outline-none focus-visible:underline after:absolute after:inset-0">
                {placement.studentFullName ?? placement.studentEmail ?? placement.studentUserId}
              </Link>
            </h3>
            <p className="mt-1 truncate text-sm text-foreground-secondary">{headline}</p>
            <p className="mt-1 text-xs text-muted">{[context, trailing].filter(Boolean).join(' · ')}</p>
          </div>
          {badge}
        </div>
      </Card>
    </li>
  )
}

/**
 * Attendance still waiting on this supervisor: days they recorded that nobody has confirmed, and
 * days the student has disputed. Both are settled through {@code AttendanceService}, which requires
 * the ASSIGNED organization supervisor on a RUNNING placement.
 */
function AttendanceQueue({ placements }: { placements: PlacementResponse[] }) {
  const { t } = useTranslation()
  const records = usePlacementRecords(placements, 'attendance')

  const rows = records.rows
    .map((row) => ({
      placement: row.placement,
      unsettled: unsettledAttendance(row.data ?? []),
      disputed: disputedAttendance(row.data ?? []),
    }))
    .filter((row) => row.unsettled.length > 0)
    .sort((a, b) => b.disputed.length - a.disputed.length || b.unsettled.length - a.unsettled.length)

  return (
    <QueueChrome records={{ ...records, scannedCount: records.rows.length }}>
      {rows.length === 0 ? (
        <EmptyState
          title={t('organization:supervision.attendanceClear')}
          description={t('organization:supervision.attendanceClearHint')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ placement, unsettled, disputed }) => {
            const oldest = [...unsettled].sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate))[0]
            return (
              <QueueRow
                key={placement.id}
                placement={placement}
                to={`/organization/placements/${placement.id}/attendance`}
                headline={
                  disputed.length > 0
                    ? t('organization:supervision.attendanceDisputed', { count: disputed.length })
                    : t('organization:supervision.attendanceUnconfirmed', { count: unsettled.length })
                }
                detail={t('organization:supervision.oldestDate', { date: formatDate(oldest.attendanceDate) })}
                badge={
                  <StatusBadge tone={disputed.length > 0 ? 'warning' : 'info'}>
                    {t(`internship:attendance.statusValues.${disputed.length > 0 ? 'DISPUTED' : 'RECORDED'}`)}
                  </StatusBadge>
                }
              />
            )
          })}
        </ul>
      )}
    </QueueChrome>
  )
}

/**
 * Evaluations this supervisor has not finished. FINAL is terminal and can never be reopened, so
 * only DRAFT, SUBMITTED and "not started yet" are work.
 */
function EvaluationQueue({ placements }: { placements: PlacementResponse[] }) {
  const { t } = useTranslation()
  const records = usePlacementRecords(placements, 'evaluation')

  const rows = records.rows
    .map((row) => ({ placement: row.placement, evaluation: row.data ?? null }))
    .filter((row) => evaluationOutstanding(row.evaluation))

  return (
    <QueueChrome records={{ ...records, scannedCount: records.rows.length }}>
      {rows.length === 0 ? (
        <EmptyState
          title={t('organization:supervision.evaluationsClear')}
          description={t('organization:supervision.evaluationsClearHint')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ placement, evaluation }) => (
            <QueueRow
              key={placement.id}
              placement={placement}
              to={`/organization/placements/${placement.id}/evaluation`}
              headline={
                evaluation
                  ? t('organization:supervision.evaluationProgress', {
                      done: evaluationRatingsComplete(evaluation),
                      total: 6,
                    })
                  : t('organization:supervision.evaluationNotStarted')
              }
              detail={
                evaluation?.submittedAt
                  ? t('organization:supervision.submittedOn', { date: formatDate(evaluation.submittedAt) })
                  : ''
              }
              badge={
                <StatusBadge tone={evaluation ? EVALUATION_STATE_TONE[evaluation.state] : 'neutral'}>
                  {evaluation
                    ? t(`internship:evaluation.stateValues.${evaluation.state}`)
                    : t('organization:supervisorDashboard.evaluationNotStarted')}
                </StatusBadge>
              }
            />
          ))}
        </ul>
      )}
    </QueueChrome>
  )
}
