import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../../placements/api/placementsApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { useSupervisionRecords, type SupervisionRecords, type SupervisionSection } from '../hooks/useSupervisionRecords'
import { disputedAttendance, logsAwaitingReview, reportAwaitingReview } from '../supervisionMetrics'
import { WEEKLY_LOG_STATE_TONE } from '../../weekly-logs/components/weeklyLogTone'
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
import type { FinalReportState } from '../../final-reports/types'
import type { PlacementResponse } from '../../placements/types'

const REPORT_STATE_TONE: Record<FinalReportState, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  NEEDS_REVISION: 'warning',
  APPROVED: 'success',
}

const SECTIONS: SupervisionSection[] = ['weekly-logs', 'final-report', 'attendance']

/**
 * Everything on the caller's supervised placements that is waiting on somebody, gathered into one
 * screen instead of asking staff to open each placement to find out.
 *
 * <p>Access comes entirely from the placement list the API returned. That list is already narrowed
 * to the caller's real scope — a whole university for an admin, assigned departments for a
 * coordinator, actively assigned placements for a supervisor
 * ({@code PlacementQueryService.listForUniversity}) — and this page never asks about a placement
 * outside it. Every per-placement request is re-authorized by
 * {@code InternshipManagementAuthorization} regardless, so this is a convenience over the same
 * boundary, not a way around it (CLAUDE.md section 24).
 *
 * <p>Only the open tab fetches, because each tab costs one request per running placement — the
 * internship API is addressed per placement and has no cross-placement endpoint
 * (see {@link useSupervisionRecords}).
 */
export function SupervisionQueuePage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const [section, setSection] = useState<SupervisionSection>('weekly-logs')

  const placementsQuery = useQuery({
    queryKey: ['placements', 'university', universityId],
    queryFn: () => placementsApi.listUniversityPlacements(universityId),
  })

  const placements = placementsQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('university:supervision.eyebrow')}
        title={t('university:supervision.title')}
        description={t('university:supervision.subtitle')}
      />

      <Tabs
        label={t('university:supervision.tabsLabel')}
        value={section}
        onValueChange={(value) => setSection(value as SupervisionSection)}
        items={SECTIONS.map((id) => ({ id, label: t(`university:supervision.tabs.${id}`) }))}
      />

      {placementsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : placementsQuery.isError ? (
        <ErrorState onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : section === 'weekly-logs' ? (
        <WeeklyLogQueue placements={placements} />
      ) : section === 'final-report' ? (
        <FinalReportQueue placements={placements} />
      ) : (
        <AttendanceQueue placements={placements} />
      )}
    </PageContainer>
  )
}

/**
 * The chrome every tab shares: how much was scanned, whether anything failed, and the list itself.
 *
 * <p>Each tab calls the fan-out hook with its own literal section so the row type stays concrete;
 * this component holds only what all three have in common.
 */
function QueueChrome({
  records,
  children,
}: {
  records: Pick<SupervisionRecords<SupervisionSection>, 'isLoading' | 'hasErrors' | 'notScanned' | 'totalInScope'> & {
    scannedCount: number
  }
  children: ReactNode
}) {
  const { t } = useTranslation()

  if (records.totalInScope === 0) {
    return (
      <EmptyState
        title={t('university:supervision.noRunningPlacements')}
        description={t('university:supervision.noRunningPlacementsHint')}
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
          ? t('university:supervision.scannedPartial', {
              scanned: records.scannedCount,
              total: records.totalInScope,
            })
          : t('university:supervision.scanned', { count: records.totalInScope })}
      </p>

      {records.hasErrors && <Alert tone="warning">{t('university:supervision.partialError')}</Alert>}

      {children}
    </div>
  )
}

/** The one row shape every tab uses, so a placement reads identically across all three. */
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
  const context = [placement.departmentName, placement.organizationName].filter(Boolean).join(' · ')
  const trailing =
    detail || t('placements:detail.dateRange', { start: formatDate(placement.startDate), end: formatDate(placement.endDate) })

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

function WeeklyLogQueue({ placements }: { placements: PlacementResponse[] }) {
  const { t } = useTranslation()
  const records = useSupervisionRecords(placements, 'weekly-logs')

  const rows = records.rows
    .map((row) => ({ placement: row.placement, pending: logsAwaitingReview(row.data ?? []) }))
    .filter((row) => row.pending.length > 0)

  return (
    <QueueChrome records={{ ...records, scannedCount: records.rows.length }}>
      {rows.length === 0 ? (
        <EmptyState title={t('university:supervision.logsClear')} description={t('university:supervision.logsClearHint')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ placement, pending }) => {
            const oldest = [...pending].sort((a, b) => a.weekNumber - b.weekNumber)[0]
            return (
              <QueueRow
                key={placement.id}
                placement={placement}
                to={`/university/placements/${placement.id}/weekly-logs`}
                headline={t('university:supervision.logsPending', { count: pending.length })}
                detail={t('university:supervision.oldestWeek', {
                  week: oldest.weekNumber,
                  date: formatDate(oldest.submittedAt),
                })}
                badge={
                  <StatusBadge tone={WEEKLY_LOG_STATE_TONE.SUBMITTED}>
                    {t('internship:weeklyLogs.stateValues.SUBMITTED')}
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

function FinalReportQueue({ placements }: { placements: PlacementResponse[] }) {
  const { t } = useTranslation()
  const records = useSupervisionRecords(placements, 'final-report')

  // Everything that has reached the university at all — submitted, sent back, or approved, with the
  // ones awaiting review first. A report still in DRAFT is the student's and has not been handed
  // over, so it is not shown here.
  const rows = records.rows
    .flatMap((row) => (row.data && row.data.state !== 'DRAFT' ? [{ placement: row.placement, report: row.data }] : []))
    .sort((a, b) => Number(reportAwaitingReview(b.report)) - Number(reportAwaitingReview(a.report)))

  return (
    <QueueChrome records={{ ...records, scannedCount: records.rows.length }}>
      {rows.length === 0 ? (
        <EmptyState
          title={t('university:supervision.reportsClear')}
          description={t('university:supervision.reportsClearHint')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ placement, report }) => (
            <QueueRow
              key={placement.id}
              placement={placement}
              to={`/university/placements/${placement.id}/final-report`}
              headline={
                reportAwaitingReview(report)
                  ? t('university:supervision.reportAwaiting')
                  : t('university:supervision.reportState', {
                      state: t(`internship:finalReport.stateValues.${report.state}`),
                    })
              }
              detail={report.submittedAt ? t('university:supervision.submittedOn', { date: formatDate(report.submittedAt) }) : ''}
              badge={
                <StatusBadge tone={REPORT_STATE_TONE[report.state]}>
                  {t(`internship:finalReport.stateValues.${report.state}`)}
                </StatusBadge>
              }
            />
          ))}
        </ul>
      )}
    </QueueChrome>
  )
}

/**
 * Disputed attendance, read-only.
 *
 * <p>University staff can SEE attendance ({@code requireWorkplaceReadAccess}) but cannot record,
 * confirm or resolve it — those all require the ASSIGNED ORGANIZATION supervisor
 * ({@code AttendanceService}). So this lists what is unsettled and links to the placement's
 * attendance view; it offers no action the API would refuse.
 */
function AttendanceQueue({ placements }: { placements: PlacementResponse[] }) {
  const { t } = useTranslation()
  const records = useSupervisionRecords(placements, 'attendance')

  const rows = records.rows
    .map((row) => ({ placement: row.placement, disputed: disputedAttendance(row.data ?? []) }))
    .filter((row) => row.disputed.length > 0)

  return (
    <QueueChrome records={{ ...records, scannedCount: records.rows.length }}>
      <p className="text-sm text-foreground-secondary">{t('university:supervision.attendanceReadOnly')}</p>
      {rows.length === 0 ? (
        <EmptyState
          title={t('university:supervision.attendanceClear')}
          description={t('university:supervision.attendanceClearHint')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ placement, disputed }) => {
            const oldest = [...disputed].sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate))[0]
            return (
              <QueueRow
                key={placement.id}
                placement={placement}
                to={`/university/placements/${placement.id}/attendance`}
                headline={t('university:supervision.attendanceDisputed', { count: disputed.length })}
                detail={t('university:supervision.oldestDispute', { date: formatDate(oldest.attendanceDate) })}
                badge={<StatusBadge tone="warning">{t('internship:attendance.statusValues.DISPUTED')}</StatusBadge>}
              />
            )
          })}
        </ul>
      )}
    </QueueChrome>
  )
}
