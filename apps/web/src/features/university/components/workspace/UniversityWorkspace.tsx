import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AttentionQueue, ErrorState, Metric, Panel, SkeletonList, StatusBadge, StatusDistribution } from '../../../../components/ui'
import { ENROLLMENT_VERIFICATION_TONE, OPPORTUNITY_TARGET_STATUS_TONE, PLACEMENT_STATUS_TONE, toneOf } from '../../../../lib/status/statusTones'
import { formatDate } from '../../../../lib/utils/formatDate'
import type { PlacementResponse } from '../../../placements/types'
import type { TargetRequestResponse } from '../../../recruitment/types'
import type { DepartmentResponse, StudentRowResponse, VerificationCaseResponse } from '../../types'
import {
  REVIEWABLE_CASE_STATUSES,
  UNIVERSITY_ATTENTION_DESTINATION,
  UNIVERSITY_INFORMATIONAL,
  requestNeedsNominees,
  type UniversityAttention,
} from '../../universityAttention'
import { PLACEMENT_STATUS_ORDER, countByPlacementStatus, studentsByDepartment } from '../../universityMetrics'

/**
 * The building blocks every university role's home is composed from (Phase 7). Each role's page
 * decides WHICH blocks it shows and in what order — the admin's institution, the coordinator's
 * departments, the supervisor's students — so the pattern reads the same everywhere without one
 * dashboard hiding another's controls. Every block takes its own loading and error state, so one
 * failed list never blanks the page.
 */

export const workspaceLinkClass =
  'rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

const k = 'university:workspace'

export function UniversityAttentionQueue({
  items,
  clearBody,
  loading = false,
  failed = false,
  onRetry,
}: {
  items: UniversityAttention[]
  clearBody: string
  loading?: boolean
  /** Some of the lists behind the queue could not be read: say so, and never imply "caught up". */
  failed?: boolean
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <section aria-label={t(`${k}.attention.title`)} aria-busy="true">
        <SkeletonList rows={2} />
      </section>
    )
  }
  if (failed && items.length === 0) {
    return (
      <section aria-labelledby="university-attention-error">
        <h2 id="university-attention-error" className="text-title-section text-foreground">{t(`${k}.attention.title`)}</h2>
        <ErrorState variant="inline" className="mt-3" description={t(`${k}.attention.partial`)} onRetry={onRetry} retryLabel={t('common:actions.retry')} />
      </section>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <AttentionQueue
        title={t(`${k}.attention.title`)}
        clearTitle={t(`${k}.attention.clearTitle`)}
        clearBody={clearBody}
        items={items.map((item) => ({
          id: item.kind,
          count: item.count,
          title: t(`${k}.attention.items.${item.kind}.title`, { count: item.count }),
          action: { label: t(`${k}.attention.items.${item.kind}.action`), to: UNIVERSITY_ATTENTION_DESTINATION[item.kind] },
          tone: UNIVERSITY_INFORMATIONAL.has(item.kind) ? 'info' : 'action',
        }))}
      />
      {failed && <ErrorState variant="inline" description={t(`${k}.attention.partial`)} onRetry={onRetry} retryLabel={t('common:actions.retry')} />}
    </div>
  )
}

/** At most four honest figures. `undefined` renders a dash while that figure is loading or unavailable. */
export function UniversityMetrics({ metrics }: { metrics: { id: string; label: string; value: number | undefined; context?: ReactNode; to?: string }[] }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t(`${k}.metrics.title`)}>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-border bg-surface p-5 lg:grid-cols-4">
        {metrics.map((metric) => (
          <li key={metric.id} className="min-w-0">
            <Metric
              label={metric.label}
              value={metric.value ?? '—'}
              context={metric.value === undefined ? undefined : metric.context}
              to={metric.value === undefined ? undefined : metric.to}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function SectionBody({ loading, error, onRetry, children }: { loading: boolean; error: boolean; onRetry?: () => void; children: ReactNode }) {
  const { t } = useTranslation()
  if (loading) return <SkeletonList rows={4} />
  if (error) return <ErrorState variant="inline" onRetry={onRetry} retryLabel={t('common:actions.retry')} />
  return <>{children}</>
}

/**
 * Students waiting for their enrollment to be checked — oldest submission first, so nobody waits
 * longest unseen. Only reviewable cases ({@code VerificationReviewService.requireReviewable}).
 */
export function VerificationCaseQueue({
  cases,
  departments,
  loading,
  error,
  onRetry,
  limit = 5,
}: {
  cases: VerificationCaseResponse[]
  departments: DepartmentResponse[]
  loading: boolean
  error: boolean
  onRetry?: () => void
  limit?: number
}) {
  const { t } = useTranslation()
  const names = new Map(departments.map((department) => [department.id, department.name]))
  const open = cases
    .filter((item) => REVIEWABLE_CASE_STATUSES.has(item.status))
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
  const rows = open.slice(0, limit)
  const flush = !loading && !error && rows.length > 0
  return (
    <Panel
      title={t(`${k}.cases.title`)}
      description={t(`${k}.cases.description`)}
      padding={flush ? 'none' : 'default'}
      action={<Link to="/university/verification-cases?status=OPEN" className={workspaceLinkClass}>{t('university:dashboard.viewAll')}</Link>}
    >
      <SectionBody loading={loading} error={error} onRetry={onRetry}>
        {rows.length === 0 ? (
          <p className="text-body text-foreground-secondary">{t(`${k}.cases.empty`)}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <Link to={`/university/verification-cases/${item.id}`} className={`block break-words ${workspaceLinkClass} text-foreground`}>
                    {item.studentFullName || item.studentEmail || t('university:caseDetail.case')}
                  </Link>
                  <span className="mt-0.5 block break-words text-caption text-foreground-secondary">
                    {[item.departmentId && names.get(item.departmentId), item.studentNumber, item.submittedAt && t('university:verificationQueue.submittedOn', { date: formatDate(item.submittedAt) })]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <StatusBadge tone={toneOf(ENROLLMENT_VERIFICATION_TONE, item.status)}>{t(`university:students.statusValues.${item.status}`)}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
        {open.length > rows.length && (
          <p className="border-t border-border px-5 py-3 text-caption text-foreground-secondary">{t(`${k}.cases.more`, { count: open.length - rows.length })}</p>
        )}
      </SectionBody>
    </Panel>
  )
}

/** Internships asking this university for nominees — nearest deadline first. */
export function NominationRequestQueue({
  requests,
  loading,
  error,
  onRetry,
  limit = 5,
}: {
  requests: TargetRequestResponse[]
  loading: boolean
  error: boolean
  onRetry?: () => void
  limit?: number
}) {
  const { t } = useTranslation()
  const open = requests.filter((request) => requestNeedsNominees(request)).sort((a, b) => a.nominationDeadline.localeCompare(b.nominationDeadline))
  const rows = open.slice(0, limit)
  const flush = !loading && !error && rows.length > 0
  return (
    <Panel
      title={t(`${k}.requests.title`)}
      description={t(`${k}.requests.description`)}
      padding={flush ? 'none' : 'default'}
      action={<Link to="/university/opportunity-requests" className={workspaceLinkClass}>{t('university:dashboard.viewAll')}</Link>}
    >
      <SectionBody loading={loading} error={error} onRetry={onRetry}>
        {rows.length === 0 ? (
          <p className="text-body text-foreground-secondary">{t(`${k}.requests.empty`)}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((request) => (
              <li key={request.targetId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <Link to={`/university/opportunity-requests/${request.targetId}`} className={`block break-words ${workspaceLinkClass} text-foreground`}>
                    {request.opportunityTitle}
                  </Link>
                  <span className="mt-0.5 block break-words text-caption text-foreground-secondary">
                    {request.organizationName} · {t('recruitment:requests.deadline', { deadline: formatDate(request.nominationDeadline) })}
                  </span>
                </span>
                <span className="text-caption font-semibold text-foreground">
                  {t('recruitment:requests.progress', { current: request.liveNominationCount, requested: request.requestedNominees })}
                </span>
                <StatusBadge tone={toneOf(OPPORTUNITY_TARGET_STATUS_TONE, request.targetStatus)}>{t(`recruitment:targetStatusValues.${request.targetStatus}`)}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </SectionBody>
    </Panel>
  )
}

/** Where this university's internships stand, in lifecycle order. Secondary context. */
export function PlacementStatusPanel({ placements, loading, error, onRetry }: { placements: PlacementResponse[]; loading: boolean; error: boolean; onRetry?: () => void }) {
  const { t } = useTranslation()
  const counts = countByPlacementStatus(placements)
  return (
    <Panel
      title={t('university:dashboard.placementOverview')}
      action={<Link to="/university/placements" className={workspaceLinkClass}>{t('university:dashboard.viewAll')}</Link>}
    >
      <SectionBody loading={loading} error={error} onRetry={onRetry}>
        <StatusDistribution
          label={t('university:dashboard.placementOverview')}
          emptyLabel={t('university:dashboard.noPlacements')}
          items={PLACEMENT_STATUS_ORDER.map((status) => ({
            id: status,
            label: t(`placements:statusValues.${status}`),
            value: counts[status],
            tone: PLACEMENT_STATUS_TONE[status],
          }))}
        />
      </SectionBody>
    </Panel>
  )
}

/** Verified enrollment per department, largest first. Secondary context. */
export function DepartmentBreakdown({
  students,
  departments,
  loading,
  error,
  onRetry,
}: {
  students: StudentRowResponse[]
  departments: DepartmentResponse[]
  loading: boolean
  error: boolean
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const names = new Map(departments.map((department) => [department.id, department.name]))
  const rows = studentsByDepartment(students).slice(0, 6)
  return (
    <Panel
      title={t('university:dashboard.byDepartment')}
      padding={!loading && !error && rows.length > 0 ? 'none' : 'default'}
      action={<Link to="/university/departments" className={workspaceLinkClass}>{t('university:dashboard.viewAll')}</Link>}
    >
      <SectionBody loading={loading} error={error} onRetry={onRetry}>
        {rows.length === 0 ? (
          <p className="text-body text-foreground-secondary">{t('university:students.empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.departmentId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
                <Link to={`/university/students?department=${row.departmentId}`} className={`min-w-0 break-words ${workspaceLinkClass} text-foreground`}>
                  {names.get(row.departmentId) ?? t('university:workspace.unknownDepartment')}
                </Link>
                <span className="text-caption text-foreground-secondary">
                  {t('university:dashboard.verifiedOf', { verified: row.verifiedCount, total: row.studentCount })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionBody>
    </Panel>
  )
}

/** The running internships this member works with, newest start first, each opening its placement hub. */
export function CurrentInternsPanel({
  title,
  description,
  placements,
  loading,
  error,
  onRetry,
  detail,
  emptyLabel,
  viewAllTo = '/university/placements',
  limit = 6,
}: {
  title: string
  description?: string
  placements: PlacementResponse[]
  loading: boolean
  error: boolean
  onRetry?: () => void
  /** One extra line per intern — what is waiting on this placement, if anything. */
  detail?: (placement: PlacementResponse) => ReactNode
  emptyLabel: string
  viewAllTo?: string
  limit?: number
}) {
  const { t } = useTranslation()
  const rows = placements
    .filter((placement) => placement.status === 'ACTIVE' || placement.status === 'COMPLETION_PENDING' || placement.status === 'PLANNED')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, limit)
  return (
    <Panel
      title={title}
      description={description}
      padding={!loading && !error && rows.length > 0 ? 'none' : 'default'}
      action={<Link to={viewAllTo} className={workspaceLinkClass}>{t('university:dashboard.viewAll')}</Link>}
    >
      <SectionBody loading={loading} error={error} onRetry={onRetry}>
        {rows.length === 0 ? (
          <p className="text-body text-foreground-secondary">{emptyLabel}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((placement) => (
              <li key={placement.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <Link to={`/university/placements/${placement.id}`} className={`block break-words ${workspaceLinkClass} text-foreground`}>
                    {placement.studentFullName ?? placement.studentEmail ?? t(`${k}.unknownStudent`)}
                  </Link>
                  <span className="mt-0.5 block break-words text-caption text-foreground-secondary">
                    {[placement.organizationName, placement.opportunityTitle].filter(Boolean).join(' · ')}
                  </span>
                  {detail?.(placement)}
                </span>
                <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>{t(`placements:statusValues.${placement.status}`)}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </SectionBody>
    </Panel>
  )
}
