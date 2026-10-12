import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, PageHeader } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { universityQueries } from '../universityQueries'
import { coordinationAttention, REVIEWABLE_CASE_STATUSES, requestNeedsNominees } from '../universityAttention'
import { livePlacementCount } from '../universityMetrics'
import {
  CurrentInternsPanel,
  NominationRequestQueue,
  UniversityAttentionQueue,
  UniversityMetrics,
  VerificationCaseQueue,
} from '../components/workspace/UniversityWorkspace'

/**
 * The Department Coordinator's home (Phase 7): their departments' coordination work.
 *
 * <p>Not the admin dashboard with institution blocks hidden. A coordinator puts students forward
 * for internships, checks enrollments and closes finished internships for the departments they are
 * assigned — so the primary work here is the nomination requests, beside the verification queue,
 * with their running internships underneath. Every list arrives already narrowed to their
 * departments by the backend ({@code UniversityAuthorization.requireDepartmentScope}), so every
 * figure is a department figure.
 *
 * <p>With no department assigned a coordinator has no scope at all — the backend refuses every
 * scoped request — so the page says that and asks nothing of the API.
 */
export function CoordinatorDashboardPage() {
  const { t } = useTranslation()
  const { universityId, departmentIds } = useUniversityMembership()
  const scoped = departmentIds.length > 0

  const departmentsQuery = useQuery({ ...universityQueries.departments(universityId), enabled: scoped })
  const studentsQuery = useQuery({ ...universityQueries.students(universityId), enabled: scoped })
  const casesQuery = useQuery({ ...universityQueries.verificationCases(universityId), enabled: scoped })
  const requestsQuery = useQuery({ ...universityQueries.targetRequests(universityId), enabled: scoped })
  const nominationsQuery = useQuery({ ...universityQueries.nominations(universityId), enabled: scoped })
  const placementsQuery = useQuery({ ...universityQueries.placements(universityId), enabled: scoped })

  const myDepartments = (departmentsQuery.data ?? []).filter((department) => departmentIds.includes(department.id))
  const scopeLine =
    myDepartments.length > 0
      ? t('university:workspace.coordinator.scope', { departments: myDepartments.map((department) => department.name).join(', ') })
      : t('university:workspace.coordinator.subtitle')

  if (!scoped) {
    return (
      <PageContainer className="flex flex-col gap-8">
        <PageHeader title={t('university:workspace.coordinator.title')} description={t('university:workspace.coordinator.subtitle')} />
        <Alert tone="info" title={t('university:workspace.coordinator.noScopeTitle')}>
          {t('university:workspace.coordinator.noScopeBody')}
        </Alert>
      </PageContainer>
    )
  }

  const attentionSources = [casesQuery, requestsQuery, nominationsQuery, placementsQuery]
  const attention = coordinationAttention({
    cases: casesQuery.data,
    requests: requestsQuery.data,
    nominations: nominationsQuery.data,
    placements: placementsQuery.data,
  })

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader title={t('university:workspace.coordinator.title')} description={scopeLine} />

      <UniversityAttentionQueue
        items={attention}
        clearBody={t('university:workspace.attention.coordinatorClearBody')}
        loading={attentionSources.some((query) => query.isLoading)}
        failed={attentionSources.some((query) => query.isError)}
        onRetry={() => attentionSources.filter((query) => query.isError).forEach((query) => void query.refetch())}
      />

      <UniversityMetrics
        metrics={[
          {
            id: 'students',
            label: t('university:workspace.metrics.departmentStudents'),
            value: studentsQuery.data?.length,
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
            value: placementsQuery.data ? livePlacementCount(placementsQuery.data) : undefined,
            to: '/university/placements',
          },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <NominationRequestQueue
          requests={requestsQuery.data ?? []}
          loading={requestsQuery.isLoading}
          error={requestsQuery.isError}
          onRetry={() => void requestsQuery.refetch()}
        />
        <VerificationCaseQueue
          cases={casesQuery.data ?? []}
          departments={departmentsQuery.data ?? []}
          loading={casesQuery.isLoading}
          error={casesQuery.isError}
          onRetry={() => void casesQuery.refetch()}
        />
      </div>

      <CurrentInternsPanel
        title={t('university:workspace.coordinator.internsTitle')}
        placements={placementsQuery.data ?? []}
        loading={placementsQuery.isLoading}
        error={placementsQuery.isError}
        onRetry={() => void placementsQuery.refetch()}
        emptyLabel={t('university:workspace.coordinator.internsEmpty')}
        detail={(placement) =>
          placement.status === 'COMPLETION_PENDING' ? (
            <span className="mt-0.5 block text-caption font-semibold text-foreground">{t('university:workspace.interns.readyToComplete')}</span>
          ) : !placement.universitySupervisor ? (
            <span className="mt-0.5 block text-caption text-foreground-secondary">{t('university:workspace.interns.noSupervisor')}</span>
          ) : null
        }
      />
    </PageContainer>
  )
}
