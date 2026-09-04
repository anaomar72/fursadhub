import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { universityCapabilities } from '../universityCapabilities'
import { SupervisorDashboardPage } from './SupervisorDashboardPage'
import { PLACEMENT_STATUS_TONE } from '../../placements/components/statusTone'
import {
  PLACEMENT_STATUS_ORDER,
  countByPlacementStatus,
  livePlacementCount,
  partnerOrganizations,
  placedStudentCount,
  studentsByDepartment,
  verifiedStudentCount,
} from '../universityMetrics'
import { Card, ErrorState, Icon, type IconName, LoadingState, ProgressIndicator, StatusBadge, StatusDistribution } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

const OPEN_CASE_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW'])
const OPEN_TARGET_STATUSES = new Set(['REQUESTED', 'ACKNOWLEDGED', 'NOMINATING'])

/**
 * The university's home (design reference 12_university_dashboard_clean.png): the size of the
 * cohort, what is live, and the two queues that actually need someone to act today.
 *
 * <p>Every figure is counted from a list endpoint the caller is already authorized to read — see
 * universityMetrics.ts. The approved design shows a twelve-month placement line chart; the API
 * exposes no time series for it, so that panel carries the real distribution of placements across
 * their lifecycle states instead of a fabricated trend.
 */
export function DashboardPage() {
  const membership = useUniversityMembership()

  // A supervisor gets their OWN dashboard rather than this one with tiles switched off. None of the
  // queries below admit UNIVERSITY_SUPERVISOR — the student directory, the verification queue, the
  // opportunity requests and the nomination list all require UNIVERSITY_ADMIN or
  // DEPARTMENT_COORDINATOR — so rendering this for them would mean four guaranteed 403s displayed
  // as four zeros, which is worse than useless: it looks like data (CLAUDE.md section 24).
  if (universityCapabilities(membership).scopedToAssignedPlacements) {
    return <SupervisorDashboardPage />
  }
  return <StaffDashboard />
}

/**
 * The admin/coordinator dashboard. A coordinator's lists arrive already narrowed to their assigned
 * departments, so these totals are department totals — the same counts, honestly scoped by the API.
 */
function StaffDashboard() {
  const { t } = useTranslation()
  const { universityId, role } = useUniversityMembership()
  const isAdmin = role === 'UNIVERSITY_ADMIN'

  const studentsQuery = useQuery({
    queryKey: ['university', 'students', universityId, ''],
    queryFn: () => universityApi.listStudents(universityId),
    retry: false,
  })
  const departmentsQuery = useQuery({
    queryKey: ['departments', universityId],
    queryFn: () => universityApi.listDepartments(universityId),
    retry: false,
  })
  const queueQuery = useQuery({
    queryKey: ['university', 'verification-queue', universityId],
    queryFn: () => universityApi.listVerificationQueue(universityId),
    retry: false,
  })
  const requestsQuery = useQuery({
    queryKey: ['university', 'target-requests', universityId],
    queryFn: () => recruitmentApi.listTargetRequests(universityId),
    retry: false,
  })
  const nominationsQuery = useQuery({
    queryKey: ['university', 'nominations', universityId],
    queryFn: () => recruitmentApi.listUniversityNominations(universityId),
    retry: false,
  })
  const placementsQuery = useQuery({
    queryKey: ['university', 'placements', universityId],
    queryFn: () => placementsApi.listUniversityPlacements(universityId),
    retry: false,
  })

  if (placementsQuery.isLoading || studentsQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  // The two queries this dashboard is actually built from. The department and nomination queries
  // enrich it and are allowed to fail quietly — their sections render empty rather than taking the
  // whole page down.
  if (placementsQuery.isError || studentsQuery.isError) {
    return (
      <PageContainer>
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => {
            void placementsQuery.refetch()
            void studentsQuery.refetch()
          }}
          retryLabel={t('common:actions.retry')}
        />
      </PageContainer>
    )
  }

  const students = studentsQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const placements = placementsQuery.data ?? []
  const nominations = nominationsQuery.data ?? []

  const openCases = (queueQuery.data ?? []).filter((item) => OPEN_CASE_STATUSES.has(item.status)).length
  const openRequests = (requestsQuery.data ?? []).filter((item) => OPEN_TARGET_STATUSES.has(item.targetStatus)).length
  const pendingNominations = nominations.filter((item) => item.status === 'PENDING_STUDENT_CONSENT').length
  const partners = partnerOrganizations(placements)
  const verified = verifiedStudentCount(students)
  const statusCounts = countByPlacementStatus(placements)
  const departmentRows = studentsByDepartment(students)
  const departmentName = (id: string) => departments.find((department) => department.id === id)?.name ?? id

  const recentNominations = [...nominations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <PageContainer className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-navy dark:text-foreground sm:text-3xl">
          {t('university:dashboard.title')}
        </h1>
        <p className="mt-1.5 text-sm text-foreground-secondary">{t('university:dashboard.subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="graduationCap"
          tone="brand"
          label={t('university:dashboard.totalStudents')}
          value={students.length}
          to="/university/students"
        />
        <MetricCard
          icon="badgeCheck"
          tone="teal"
          label={t('university:dashboard.activePlacements')}
          value={livePlacementCount(placements)}
          to="/university/placements"
        />
        <MetricCard
          icon="userCheck"
          tone="violet"
          label={t('university:dashboard.placedStudents')}
          value={placedStudentCount(placements)}
          to="/university/placements"
        />
        <MetricCard
          icon="building"
          tone="amber"
          label={t('university:dashboard.partnerOrganizations')}
          value={partners.length}
          to="/university/partners"
        />
      </div>

      {/* The two queues that are actually somebody's job today. */}
      {(openCases > 0 || openRequests > 0 || pendingNominations > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard
            label={t('university:dashboard.verificationQueue')}
            value={openCases}
            to="/university/verification-cases"
            hint={t('university:dashboard.needsAction')}
            tone={openCases > 0 ? 'warning' : 'success'}
          />
          <ActionCard
            label={t('university:dashboard.opportunityRequests')}
            value={openRequests}
            to="/university/opportunity-requests"
            hint={t('university:dashboard.needsAction')}
            tone={openRequests > 0 ? 'warning' : 'success'}
          />
          <ActionCard
            label={t('university:dashboard.nominations')}
            value={pendingNominations}
            to="/university/nominations"
            hint={t('university:dashboard.awaitingStudent')}
            tone="info"
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
                {t('university:dashboard.placementOverview')}
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">{t('university:dashboard.placementOverviewHint')}</p>
            </div>
            <Link to="/university/placements" className="shrink-0 text-sm font-semibold text-link hover:underline">
              {t('university:dashboard.viewAll')}
            </Link>
          </div>
          <StatusDistribution
            className="mt-5"
            label={t('university:dashboard.placementOverview')}
            emptyLabel={t('university:dashboard.noPlacements')}
            items={PLACEMENT_STATUS_ORDER.map((status) => ({
              id: status,
              label: t(`placements:statusValues.${status}`),
              value: statusCounts[status],
              tone: PLACEMENT_STATUS_TONE[status],
            }))}
          />
        </Card>

        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('university:dashboard.verificationProgress')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('university:dashboard.verificationProgressHint')}</p>
          <ProgressIndicator
            className="mt-5"
            label={t('university:dashboard.verifiedOf', { verified, total: students.length })}
            value={students.length === 0 ? 0 : Math.round((verified / students.length) * 100)}
          />
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
            <div>
              <dt className="text-xs text-foreground-secondary">{t('university:dashboard.verified')}</dt>
              <dd className="mt-1 text-2xl font-bold text-brand-navy dark:text-foreground">{verified}</dd>
            </div>
            <div>
              <dt className="text-xs text-foreground-secondary">{t('university:dashboard.departments')}</dt>
              <dd className="mt-1 text-2xl font-bold text-brand-navy dark:text-foreground">{departments.length}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('university:dashboard.partnerOrganizations')}
            action={
              <Link to="/university/partners" className="text-sm font-semibold text-link hover:underline">
                {t('university:dashboard.viewAll')}
              </Link>
            }
          />
          {partners.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('university:partners.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {partners.slice(0, 4).map((partner) => (
                <li key={partner.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info">
                    <Icon name="building" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">
                      {partner.name ?? t('university:partners.unnamed')}
                    </span>
                    <span className="block text-xs text-muted">
                      {t('university:partners.placementCount', { count: partner.placementCount })}
                    </span>
                  </span>
                  {partner.livePlacementCount > 0 && (
                    <StatusBadge tone="success">
                      {t('university:partners.liveCount', { count: partner.livePlacementCount })}
                    </StatusBadge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('university:dashboard.recentNominations')}
            action={
              <Link to="/university/nominations" className="text-sm font-semibold text-link hover:underline">
                {t('university:dashboard.viewAll')}
              </Link>
            }
          />
          {recentNominations.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('recruitment:nominations.emptyUniversity')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentNominations.map((nomination) => (
                <li key={nomination.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {nomination.studentFullName ?? nomination.studentEmail ?? nomination.studentUserId}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {nomination.opportunityTitle ?? ''} · {formatDate(nomination.createdAt)}
                    </span>
                  </span>
                  <StatusBadge tone={nomination.status === 'ACCEPTED' ? 'success' : nomination.status === 'PENDING_STUDENT_CONSENT' ? 'info' : 'neutral'}>
                    {t(`recruitment:nominationStatusValues.${nomination.status}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {isAdmin && departmentRows.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('university:dashboard.byDepartment')}
            action={
              <Link to="/university/departments" className="text-sm font-semibold text-link hover:underline">
                {t('university:dashboard.viewAll')}
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {departmentRows.slice(0, 6).map((row) => (
              <li key={row.departmentId} className="flex items-center gap-4 px-5 py-3.5">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {departmentName(row.departmentId)}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {t('university:dashboard.verifiedOf', { verified: row.verifiedCount, total: row.studentCount })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageContainer>
  )
}

function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
      <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">{title}</h2>
      {action}
    </div>
  )
}

const METRIC_TONES = {
  brand: 'bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info',
  violet: 'bg-info-bg text-info',
  teal: 'bg-success-bg text-success',
  amber: 'bg-warning-bg text-warning',
} as const

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
  value: number
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

function ActionCard({
  label,
  value,
  to,
  hint,
  tone,
}: {
  label: string
  value: number
  to: string
  hint: string
  tone: 'warning' | 'success' | 'info'
}) {
  return (
    <Card interactive padding="lg" className="relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">
            <Link to={to} className="focus-visible:outline-none focus-visible:underline after:absolute after:inset-0">
              {label}
            </Link>
          </h2>
          <p className="mt-2 text-2xl font-bold leading-none text-brand-navy dark:text-foreground">{value}</p>
        </div>
        <StatusBadge tone={value > 0 ? tone : 'neutral'}>{hint}</StatusBadge>
      </div>
    </Card>
  )
}
