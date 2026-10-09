import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as publicOpportunityApi from '../../opportunities/api/publicOpportunityApi'
import * as weeklyLogsApi from '../../weekly-logs/api/weeklyLogsApi'
import * as attendanceApi from '../../attendance/api/attendanceApi'
import { readinessSteps } from '../studentReadiness'
import { isNotFound, studentQueries } from '../studentQueries'
import {
  deriveAttention,
  deriveStudentStatus,
  livePlacement,
  pendingOffers,
  type StudentRecords,
} from '../studentJourney'
import { StudentStatusHero } from '../components/journey/StudentStatusHero'
import { AttentionList } from '../components/journey/AttentionList'
import { PlacementLifecycle } from '../components/journey/PlacementLifecycle'
import { PrePlacementRoad } from '../components/journey/PrePlacementRoad'
import { RecruitmentSummary } from '../components/journey/RecruitmentSummary'
import { ErrorState, Icon, InternshipCard, PageHeader, Panel, Skeleton, SkeletonCardGrid, SkeletonList, SkeletonRegion } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * The student's workspace home.
 *
 * <p>It answers, in this order: where am I (the status hero and its one next action), what needs
 * me (the attention list — only things the student can act on), how far along am I (the internship
 * lifecycle, or the road to one), and what is going on (applications and nominations). Open
 * internships appear only while the student has no live placement; once they do, browsing is not
 * what their week is about.
 *
 * <p><strong>Loading.</strong> Nothing waits for everything. The page header renders at once; each
 * section shows a layout-shaped skeleton until its own data arrives and an inline error if only its
 * own request fails. The hero needs the four records that decide the stage, so it alone waits for
 * those; a failure there is an inline error with a retry, never a blank page.
 *
 * <p><strong>Requests.</strong> Every query is shared with the student's own pages through
 * {@link studentQueries} (one cache entry per endpoint). The internship module lists are read only
 * for a live placement whose policy requires that module, under the same keys their pages use, so
 * opening them afterwards costs nothing. The old dashboard's separate offers request is gone — the
 * live offer already arrives on each candidacy — as is the saved-internships count.
 */
export function DashboardPage() {
  const { t } = useTranslation()

  const profileQuery = useQuery(studentQueries.profile())
  const enrollmentQuery = useQuery(studentQueries.enrollment())
  const candidaciesQuery = useQuery(studentQueries.candidacies())
  const nominationsQuery = useQuery(studentQueries.nominations())
  const placementsQuery = useQuery(studentQueries.placements())

  // A 404 is the answer "no enrollment claimed yet" — a fact, not a failure.
  const enrollmentMissing = enrollmentQuery.isError && isNotFound(enrollmentQuery.error)
  const enrollmentFailed = enrollmentQuery.isError && !enrollmentMissing
  const coreLoading = enrollmentQuery.isLoading || candidaciesQuery.isLoading || nominationsQuery.isLoading || placementsQuery.isLoading
  const coreFailed = enrollmentFailed || candidaciesQuery.isError || nominationsQuery.isError || placementsQuery.isError

  const records: StudentRecords | null =
    !coreLoading && !coreFailed
      ? {
          enrollment: enrollmentMissing ? null : (enrollmentQuery.data ?? null),
          candidacies: candidaciesQuery.data ?? [],
          nominations: nominationsQuery.data ?? [],
          placements: placementsQuery.data ?? [],
        }
      : null

  const live = placementsQuery.data ? livePlacement(placementsQuery.data) : null
  const running = live?.status === 'ACTIVE' || live?.status === 'COMPLETION_PENDING'

  const completionQuery = useQuery({ ...studentQueries.completion(live?.id ?? ''), enabled: !!live })
  const requires = (type: string) => !!completionQuery.data?.requirements.some((r) => r.type === type && r.required)
  const weeklyLogsQuery = useQuery({
    queryKey: ['weekly-logs', live?.id],
    queryFn: () => weeklyLogsApi.listWeeklyLogs(live!.id),
    enabled: running && requires('WEEKLY_LOGS'),
  })
  const attendanceQuery = useQuery({
    queryKey: ['attendance', live?.id],
    queryFn: () => attendanceApi.listAttendance(live!.id),
    enabled: running && requires('ATTENDANCE'),
  })
  const openRolesQuery = useQuery({
    queryKey: ['public-opportunities', 'dashboard'],
    queryFn: () => publicOpportunityApi.listPublicOpportunities({ page: 0, size: 3 }),
    enabled: !!records && !live,
    retry: false,
  })

  const signals = {
    completion: completionQuery.data,
    weeklyLogs: weeklyLogsQuery.data,
    attendance: attendanceQuery.data,
  }

  const retryCore = () => {
    if (enrollmentFailed) void enrollmentQuery.refetch()
    if (candidaciesQuery.isError) void candidaciesQuery.refetch()
    if (nominationsQuery.isError) void nominationsQuery.refetch()
    if (placementsQuery.isError) void placementsQuery.refetch()
  }

  const name = firstName(profileQuery.data?.fullName)
  const readiness = readinessSteps({ profile: profileQuery.data ?? null, enrollment: records?.enrollment ?? null }).filter(
    (step) => step.id === 'profile' || step.id === 'professional',
  )
  const showReadiness = profileQuery.isSuccess || (profileQuery.isError && isNotFound(profileQuery.error))
  const readinessOpen = showReadiness && readiness.some((step) => !step.done)

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        title={name ? t('student:dashboard.greeting', { name }) : t('student:dashboard.greetingNoName')}
        description={t('student:dashboard.greetingSubtitle')}
      />

      {/* ------------------------------------------------------------ where am I */}
      {coreFailed ? (
        <ErrorState variant="inline" onRetry={retryCore} retryLabel={t('common:actions.retry')} />
      ) : !records ? (
        <SkeletonRegion label={t('common:status.loading')} className="rounded-xl border border-border bg-surface p-6">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-7 w-3/4 max-w-md" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <Skeleton className="mt-5 h-11 w-44" />
        </SkeletonRegion>
      ) : (
        <StudentStatusHero
          status={deriveStudentStatus(records)}
          offerDeadline={pendingOffers(records.candidacies)[0]?.liveOffer?.responseDeadline ?? null}
        />
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* ------------------------------------------------------------ what needs me */}
          {records ? (
            <AttentionList items={deriveAttention(records, signals)} />
          ) : !coreFailed ? (
            <SkeletonList rows={2} />
          ) : null}

          {/* ------------------------------------------------------------ how far along */}
          {records && (
            <Panel title={live ? t('student:journey.lifecycle.title') : t('student:journey.road.title')}>
              {live ? (
                <PlacementLifecycle
                  placement={live}
                  signals={signals}
                  completionUnavailable={completionQuery.isError}
                  linkModules
                />
              ) : (
                <PrePlacementRoad records={records} />
              )}
            </Panel>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-8" aria-label={t('student:journey.recruitment.title')}>
          {candidaciesQuery.isError || nominationsQuery.isError ? null : candidaciesQuery.data && nominationsQuery.data ? (
            <RecruitmentSummary candidacies={candidaciesQuery.data} nominations={nominationsQuery.data} />
          ) : (
            <SkeletonList rows={3} />
          )}

          {readinessOpen && (
            <Panel title={t('student:dashboard.readinessTitle')} padding="compact">
              <ul className="flex flex-col gap-2.5">
                {readiness.map((step) => (
                  <li key={step.id} className="flex items-start gap-2.5 text-body">
                    <span
                      aria-hidden="true"
                      className={
                        step.done
                          ? 'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-on-action'
                          : 'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong'
                      }
                    >
                      {step.done && <Icon name="check" className="size-3" />}
                    </span>
                    <span className={step.done ? 'text-foreground-secondary' : 'text-foreground'}>
                      {t(`student:dashboard.readinessSteps.${step.id}`)}
                      <span className="sr-only"> ({t(step.done ? 'common:lifecycle.states.complete' : 'common:lifecycle.states.upcoming')})</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/student/profile"
                className="mt-4 inline-block rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {t('student:dashboard.readinessCta')}
              </Link>
            </Panel>
          )}

        </aside>
      </div>

      {/* Full width under the two columns: three cards stacked in the side column left a large
          blank area beside them on desktop. Only while the student has no live placement. */}
      {records && !live && (
        <section aria-labelledby="dashboard-open-internships" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="dashboard-open-internships" className="font-display text-title-panel text-foreground">
              {t('student:dashboard.openInternships')}
            </h2>
            <Link to="/student/opportunities" className="rounded-sm text-body font-semibold text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              {t('student:dashboard.viewAll')}
            </Link>
          </div>
          {openRolesQuery.isLoading ? (
            <SkeletonCardGrid count={3} />
          ) : openRolesQuery.isError ? (
            <ErrorState variant="inline" description={t('opportunities:public.error')} onRetry={() => void openRolesQuery.refetch()} retryLabel={t('common:actions.retry')} />
          ) : (openRolesQuery.data?.content ?? []).length === 0 ? (
            <p className="text-body text-foreground-secondary">{t('opportunities:public.empty')}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(openRolesQuery.data?.content ?? []).map((opportunity) => (
                <li key={opportunity.id}>
                  <InternshipCard
                    density="compact"
                    title={opportunity.title}
                    titleTo={`/student/opportunities/${opportunity.id}`}
                    organization={opportunity.organization.name}
                    organizationVerified={opportunity.organization.verified}
                    location={opportunity.location ?? undefined}
                    workMode={t(`opportunities:workModeValues.${opportunity.workMode}`)}
                    tags={opportunity.skills?.slice(0, 2)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </PageContainer>
  )
}

function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? ''
}
