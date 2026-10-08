import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { InstitutionVerificationCue } from '../../../components/verification/InstitutionVerificationCue'
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
import { Card, PageHeader, SectionHeading, EmptyState, ErrorState, Icon, LoadingState, ProgressIndicator, StatusBadge, StatusDistribution, StatCard } from '../../../components/ui'
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

  // The university's own record, for the verification cue (admins only — they are the ones who can
  // act on it). Same query key as the profile page.
  const universityQuery = useQuery({
    queryKey: ['university', 'detail', universityId],
    queryFn: () => universityApi.getUniversityDetail(universityId),
    enabled: isAdmin,
    retry: false,
  })

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
      {/* The same page header every other portal page uses, rather than a hand-rolled h1 that had
          drifted a size larger than the shared one. */}
      <PageHeader
        title={t('university:dashboard.title')}
        description={t('university:dashboard.subtitle')}
      />

      <InstitutionVerificationCue namespace="university" status={universityQuery.data?.status} to="/university/profile" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="graduationCap"
          tone="brand"
          label={t('university:dashboard.totalStudents')}
          value={students.length}
          to="/university/students"
        />
        <StatCard
          icon="badgeCheck"
          tone="teal"
          label={t('university:dashboard.activePlacements')}
          value={livePlacementCount(placements)}
          to="/university/placements"
        />
        <StatCard
          icon="userCheck"
          tone="violet"
          label={t('university:dashboard.placedStudents')}
          value={placedStudentCount(placements)}
          to="/university/placements"
        />
        <StatCard
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

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            panel
            title={t('university:dashboard.recentNominations')}
            action={
              <Link to="/university/nominations" className="text-sm font-semibold text-link hover:underline">
                {t('university:dashboard.viewAll')}
              </Link>
            }
          />
          {recentNominations.length === 0 ? (
            <EmptyState
                variant="inline"
                title={t('recruitment:nominations.emptyUniversity')}
                description={t('university:dashboard.noNominationsHint')}
              />
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
        {/*
          `padding="none"` + a ruled `panel` heading, exactly like the nominations panel beside it.
          With `padding="lg"` this panel's heading sat about 8px lower than its neighbour's and had
          no rule under it, so two modules side by side started at different heights — the one thing
          a two-column row must not do.
        */}
        <div className="grid gap-5"><Card padding="none" className="overflow-hidden">
          <SectionHeading
            panel
            title={t('university:dashboard.placementOverview')}
            description={t('university:dashboard.placementOverviewHint')}
            action={
              <Link to="/university/placements" className="text-sm font-semibold text-link hover:underline">
                {t('university:dashboard.viewAll')}
              </Link>
            }
          />
          <StatusDistribution
            className="px-5 pb-5 pt-5"
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
            <SectionHeading
              title={t('university:dashboard.verificationProgress')}
              description={t('university:dashboard.verificationProgressHint')}
            />
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
          </Card></div>
      </div>

      <Card padding="none" className="overflow-hidden">
        <SectionHeading
          panel
          title={t('university:dashboard.partnerOrganizations')}
          action={
            <Link to="/university/partners" className="text-sm font-semibold text-link hover:underline">
              {t('university:dashboard.viewAll')}
            </Link>
          }
        />
        {partners.length === 0 ? (
          <EmptyState
                variant="inline"
                title={t('university:partners.empty')}
                description={t('university:dashboard.noPartnersHint')}
              />
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            {partners.slice(0, 5).map((partner) => (
              <li key={partner.id} className="flex min-w-0 flex-col items-start gap-3 rounded-lg border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
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

      {isAdmin && departmentRows.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            panel
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
