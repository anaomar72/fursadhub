import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { InstitutionVerificationCue } from '../../../components/verification/InstitutionVerificationCue'
import { PageHeader } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { universityCapabilities } from '../universityCapabilities'
import { universityQueries } from '../universityQueries'
import { coordinationAttention, REVIEWABLE_CASE_STATUSES, requestNeedsNominees } from '../universityAttention'
import { livePlacementCount, verifiedStudentCount } from '../universityMetrics'
import {
  DepartmentBreakdown,
  PlacementStatusPanel,
  UniversityAttentionQueue,
  UniversityMetrics,
  VerificationCaseQueue,
} from '../components/workspace/UniversityWorkspace'
import { SupervisorDashboardPage } from './SupervisorDashboardPage'
import { CoordinatorDashboardPage } from './CoordinatorDashboardPage'

/**
 * The university home, one per role (Phase 7). Three roles do three different jobs, so they get
 * three dashboards built from the same blocks rather than one page with widgets switched off:
 *
 * <ul>
 *   <li>{@code UNIVERSITY_ADMIN} — the institution: its verification, the cohort, the queues.</li>
 *   <li>{@code DEPARTMENT_COORDINATOR} — their departments: nominations, verification, completion.</li>
 *   <li>{@code UNIVERSITY_SUPERVISOR} — their students: logs and reports to review.</li>
 * </ul>
 *
 * <p>The supervisor split is also an access fact: none of the directory, verification, request or
 * nomination endpoints admit a supervisor, so the coordination blocks would be guaranteed 403s
 * shown as zeros (CLAUDE.md section 24). A coordinator with no assigned department has no scope at
 * all; their dashboard says so instead of firing requests that can only be refused.
 */
export function DashboardPage() {
  const membership = useUniversityMembership()
  const can = universityCapabilities(membership)

  if (can.scopedToAssignedPlacements) return <SupervisorDashboardPage />
  if (membership.role === 'DEPARTMENT_COORDINATOR') return <CoordinatorDashboardPage />
  return <AdminDashboard />
}

/**
 * The University Admin's home: institution verification once, what needs the institution's
 * attention, four figures, the verification queue as the primary work, and the shape of the cohort
 * and its internships as secondary context. Each block loads and fails on its own.
 */
function AdminDashboard() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()

  const universityQuery = useQuery(universityQueries.detail(universityId))
  const studentsQuery = useQuery(universityQueries.students(universityId))
  const departmentsQuery = useQuery(universityQueries.departments(universityId))
  const casesQuery = useQuery(universityQueries.verificationCases(universityId))
  const requestsQuery = useQuery(universityQueries.targetRequests(universityId))
  const nominationsQuery = useQuery(universityQueries.nominations(universityId))
  const placementsQuery = useQuery(universityQueries.placements(universityId))

  const attentionSources = [casesQuery, requestsQuery, nominationsQuery, placementsQuery]
  const attention = coordinationAttention({
    cases: casesQuery.data,
    requests: requestsQuery.data,
    nominations: nominationsQuery.data,
    placements: placementsQuery.data,
  })

  const students = studentsQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const placements = placementsQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader title={t('university:dashboard.title')} description={t('university:workspace.admin.subtitle')} />

      <InstitutionVerificationCue namespace="university" status={universityQuery.data?.status} to="/university/profile" />

      <UniversityAttentionQueue
        items={attention}
        clearBody={t('university:workspace.attention.clearBody')}
        loading={attentionSources.some((query) => query.isLoading)}
        failed={attentionSources.some((query) => query.isError)}
        onRetry={() => attentionSources.filter((query) => query.isError).forEach((query) => void query.refetch())}
      />

      <UniversityMetrics
        metrics={[
          {
            id: 'verified',
            label: t('university:workspace.metrics.verifiedStudents'),
            value: studentsQuery.data ? verifiedStudentCount(students) : undefined,
            context: studentsQuery.data ? t('university:workspace.metrics.ofStudents', { count: students.length }) : undefined,
            to: '/university/students',
          },
          {
            id: 'cases',
            label: t('university:workspace.metrics.casesToReview'),
            value: casesQuery.data?.filter((item) => REVIEWABLE_CASE_STATUSES.has(item.status)).length,
            to: '/university/verification-cases?status=OPEN',
          },
          {
            id: 'requests',
            label: t('university:workspace.metrics.openRequests'),
            value: requestsQuery.data?.filter((request) => requestNeedsNominees(request)).length,
            to: '/university/opportunity-requests',
          },
          {
            id: 'interns',
            label: t('university:workspace.metrics.currentInterns'),
            value: placementsQuery.data ? livePlacementCount(placements) : undefined,
            to: '/university/placements',
          },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <VerificationCaseQueue
          cases={casesQuery.data ?? []}
          departments={departments}
          loading={casesQuery.isLoading}
          error={casesQuery.isError}
          onRetry={() => void casesQuery.refetch()}
        />
        <div className="flex min-w-0 flex-col gap-6">
          <PlacementStatusPanel
            placements={placements}
            loading={placementsQuery.isLoading}
            error={placementsQuery.isError}
            onRetry={() => void placementsQuery.refetch()}
          />
          <DepartmentBreakdown
            students={students}
            departments={departments}
            loading={studentsQuery.isLoading}
            error={studentsQuery.isError}
            onRetry={() => void studentsQuery.refetch()}
          />
        </div>
      </div>
    </PageContainer>
  )
}
