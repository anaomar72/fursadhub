import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as studentApi from '../api/studentApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import * as placementsApi from '../../placements/api/placementsApi'
import * as publicOpportunityApi from '../../opportunities/api/publicOpportunityApi'
import { CANDIDACY_STATUS_TONE } from '../../recruitment/components/statusTone'
import { ACTIVE_CANDIDACY_STATUSES, readinessPercent, readinessSteps } from '../studentReadiness'
import {
  Avatar,
  Card,
  InternshipCard,
  ErrorState,
  Icon,
  LoadingState,
  ProgressIndicator,
  PageHeader,
  SectionHeading,
  StatusBadge,
  StatCard,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

const LIVE_PLACEMENT_STATUSES = new Set(['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'])

/**
 * The student's home (design reference 10_student_dashboard_clean.png): a greeting, four counters,
 * open internships, their latest applications, and how close they are to being able to take part.
 *
 * <p>Every number is counted from an endpoint the student's own pages already use — there is no
 * dashboard aggregate on the backend and none is invented here.
 *
 * <p>The approved reference's four counters are Active Applications, Interviews, Saved Internships
 * and Recommended. Saved Internships is now real (Backend Phase B4) and is read from the saved list
 * itself. "Recommended" has NO backend concept — FursadHub does not compute recommendations — so
 * that slot carries a truthful counter instead: nominations awaiting the student's consent. The
 * reference's profile-completion percentage is likewise not invented: the readiness card below
 * counts only the concrete steps the API can actually confirm.
 */
export function DashboardPage() {
  const { t } = useTranslation()

  const profileQuery = useQuery({ queryKey: ['student', 'profile'], queryFn: studentApi.getMyProfile, retry: false })
  const enrollmentQuery = useQuery({ queryKey: ['student', 'enrollment'], queryFn: studentApi.getMyEnrollment, retry: false })
  const candidaciesQuery = useQuery({ queryKey: ['student', 'candidacies'], queryFn: recruitmentApi.listMyCandidacies })
  const nominationsQuery = useQuery({ queryKey: ['student', 'nominations'], queryFn: recruitmentApi.listMyNominations })
  const offersQuery = useQuery({ queryKey: ['student', 'offers'], queryFn: recruitmentApi.listMyOffers })
  const placementsQuery = useQuery({ queryKey: ['student', 'placements'], queryFn: placementsApi.listMyPlacements })
  // Backend Phase B4. size=1 — only the TOTAL is wanted here, not the rows; the Saved Internships
  // page fetches the page it actually renders.
  const savedQuery = useQuery({
    queryKey: ['student', 'saved-list', 'dashboard-count'],
    queryFn: () => studentApi.listSavedOpportunities({ page: 0, size: 1 }),
    retry: false,
  })
  const openRolesQuery = useQuery({
    queryKey: ['public-opportunities', 'dashboard'],
    queryFn: () => publicOpportunityApi.listPublicOpportunities({ page: 0, size: 3 }),
    retry: false,
  })

  const isLoading =
    enrollmentQuery.isLoading || candidaciesQuery.isLoading || nominationsQuery.isLoading ||
    offersQuery.isLoading || placementsQuery.isLoading

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  if (candidaciesQuery.isError || nominationsQuery.isError || offersQuery.isError || placementsQuery.isError) {
    return <PageContainer><ErrorState onRetry={() => {
      void candidaciesQuery.refetch()
      void nominationsQuery.refetch()
      void offersQuery.refetch()
      void placementsQuery.refetch()
    }} /></PageContainer>
  }

  const candidacies = candidaciesQuery.data ?? []
  const nominations = nominationsQuery.data ?? []
  const offers = offersQuery.data ?? []
  const placements = placementsQuery.data ?? []

  const activeApplications = candidacies.filter((candidacy) => ACTIVE_CANDIDACY_STATUSES.has(candidacy.status)).length
  const interviews = candidacies.filter((candidacy) => candidacy.status === 'INTERVIEW').length
  const pendingNominations = nominations.filter((nomination) => nomination.status === 'PENDING_STUDENT_CONSENT').length
  const pendingOffers = offers.filter((offer) => offer.status === 'PENDING').length
  const livePlacement = placements.find((placement) => LIVE_PLACEMENT_STATUSES.has(placement.status)) ?? null

  const steps = readinessSteps({
    profile: profileQuery.data ?? null,
    enrollment: enrollmentQuery.data ?? null,
  })
  const percent = readinessPercent(steps)
  const nextStep = steps.find((step) => !step.done) ?? null

  const recentApplications = [...candidacies]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
  const openRoles = openRolesQuery.data?.content ?? []

  return (
    <PageContainer className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
      {/* The same page header every other portal page uses, rather than a hand-rolled h1 that had
          drifted a size larger than the shared one. A student who has not filled in their profile
          has no name to greet, and "Welcome back, " with a dangling comma is worse than a plain
          greeting. */}
      <PageHeader
        className="xl:col-start-1"
        title={
          firstName(profileQuery.data?.fullName)
            ? t('student:dashboard.greeting', { name: firstName(profileQuery.data?.fullName) })
            : t('student:dashboard.greetingNoName')
        }
        description={t('student:dashboard.greetingSubtitle')}
      />

      {/*
        `self-start`: the profile card in column two spans both rows, so without this the metric row
        is stretched to match its height and every tile ends up mostly empty space under its figure.
        The tiles should be as tall as their content and no taller.
      */}
      <div className="grid gap-3 self-start sm:grid-cols-2 xl:col-start-1 xl:grid-cols-4">
        <StatCard
          icon="clipboard"
          tone="brand"
          label={t('student:dashboard.applications')}
          value={activeApplications}
          to="/student/applications"
        />
        <StatCard
          icon="users"
          tone="violet"
          label={t('student:dashboard.interviews')}
          value={interviews}
          to="/student/applications"
        />
        <StatCard
          icon="bookmark"
          tone="amber"
          label={t('student:dashboard.savedInternships')}
          value={savedQuery.data?.totalElements ?? '—'}
          to="/student/saved"
        />
        <StatCard
          icon="userCheck"
          tone="teal"
          label={t('student:dashboard.nominations')}
          value={pendingNominations}
          to="/student/nominations"
        />
      </div>

      <Card padding="lg" className="xl:col-start-2 xl:row-start-1 xl:row-span-2">
        <div className="flex items-center gap-3"><Avatar name={profileQuery.data?.fullName || '?'} size="lg" /><h2 className="font-display text-base font-bold">{profileQuery.data?.fullName || t('student:profile.title')}</h2></div>
        {enrollmentQuery.data && <dl className="mt-4 space-y-2 text-xs"><div><dt className="text-muted">{t('student:enrollment.programLabel')}</dt><dd className="font-semibold">{enrollmentQuery.data.program}</dd></div><div><dt className="text-muted">{t('student:enrollment.academicYearLabel')}</dt><dd>{enrollmentQuery.data.academicYear}</dd></div></dl>}
        <Link to="/student/profile" className="mt-4 flex min-h-9 items-center justify-center rounded-lg border border-border text-xs font-semibold text-link focus-visible:ring-2">{t('student:profile.title')}</Link>
        <Link to="/student/applications" className="mt-3 flex justify-between gap-3 rounded-lg bg-brand-blue-soft p-3 text-xs font-semibold text-brand-blue focus-visible:ring-2"><span>{t('student:dashboard.offers')}</span><span>{pendingOffers}</span></Link>
      </Card>
      <div className="grid items-start gap-5 xl:col-span-2 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="contents">
          <Card padding="none" className="overflow-hidden xl:col-start-1 xl:row-start-1">
            <SectionHeading
              panel
              title={t('student:dashboard.recentApplications')}
              action={<Link to="/student/applications" className="text-sm font-semibold text-link hover:underline">{t('student:dashboard.viewAll')}</Link>}
            />
            {recentApplications.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-foreground-secondary">{t('recruitment:applications.empty')}</p>
                <Link
                  to="/student/opportunities"
                  className="mt-3 inline-flex h-9 items-center rounded-md bg-action-primary px-4 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover motion-reduce:transition-none"
                >
                  {t('student:nav.exploreInternships')}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentApplications.map((candidacy) => (
                  <li key={candidacy.id}>
                    <Link
                      to={`/student/applications/${candidacy.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring motion-reduce:transition-none"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{candidacy.opportunityTitle}</span>
                        <span className="mt-0.5 block text-xs text-muted">{formatDate(candidacy.createdAt)}</span>
                      </span>
                      <StatusBadge tone={CANDIDACY_STATUS_TONE[candidacy.status]}>
                        {t(`recruitment:candidacyStatusValues.${candidacy.status}`)}
                      </StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {livePlacement ? (
            <Card padding="lg" className="xl:col-start-2 xl:row-start-1 xl:row-span-2">
              <h2 className="text-sm font-bold text-foreground">{t('placements:nav.myPlacements')}</h2>
              <p className="mt-2 truncate text-base font-semibold text-brand-navy dark:text-foreground">
                {livePlacement.opportunityTitle ?? t('placements:detail.untitledOpportunity')}
              </p>
              <p className="mt-0.5 truncate text-sm text-foreground-secondary">{livePlacement.organizationName}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={livePlacement.status === 'ACTIVE' ? 'success' : 'info'}>
                  {t(`placements:statusValues.${livePlacement.status}`)}
                </StatusBadge>
                <span className="text-xs text-muted">
                  {formatDate(livePlacement.startDate)} — {formatDate(livePlacement.endDate)}
                </span>
              </div>
              <Link
                to={`/student/placements/${livePlacement.id}`}
                className="mt-3 inline-block text-xs font-semibold text-link hover:underline"
              >
                {t('student:dashboard.openPlacement')}
              </Link>
            </Card>
          ) : (
            <Card padding="lg" className="xl:col-start-2 xl:row-start-1 xl:row-span-2">
              <h2 className="text-sm font-bold text-foreground">{t('student:dashboard.readinessTitle')}</h2>
              <ProgressIndicator
                className="mt-3"
                label={t('student:dashboard.readinessLabel')}
                value={percent}
              />
              <ul className="mt-4 flex flex-col gap-2">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={
                        step.done
                          ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-success-bg text-success'
                          : 'flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-muted'
                      }
                    >
                      {step.done && <Icon name="check" className="size-3" />}
                    </span>
                    <span className={step.done ? 'text-foreground-secondary line-through' : 'text-foreground'}>
                      {t(`student:dashboard.readinessSteps.${step.id}`)}
                    </span>
                  </li>
                ))}
              </ul>
              {nextStep && (
                <Link to={nextStep.to} className="mt-4 inline-block text-sm font-semibold text-link hover:underline">
                  {t('student:dashboard.readinessCta')}
                </Link>
              )}
            </Card>
          )}
        </div>
        <Card padding="none" className="overflow-hidden xl:col-start-1 xl:row-start-2">
          <SectionHeading
            panel
            title={t('student:dashboard.openInternships')}
            action={<Link to="/student/opportunities" className="text-sm font-semibold text-link hover:underline">{t('student:dashboard.viewAll')}</Link>}
          />
          {openRolesQuery.isError ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('opportunities:public.error')}</p>
          ) : openRoles.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('opportunities:public.empty')}</p>
          ) : (
            <ul className="grid gap-3 p-4 md:grid-cols-3">{openRoles.map(opportunity => <li key={opportunity.id} className="relative"><InternshipCard density="compact" title={opportunity.title} titleTo={`/student/opportunities/${opportunity.id}`} organization={opportunity.organization.name} organizationVerified={opportunity.organization.verified} location={opportunity.location ?? undefined} workMode={t(`opportunities:workModeValues.${opportunity.workMode}`)} tags={opportunity.skills?.slice(0, 2)} /></li>)}</ul>
          )}
        </Card>

      </div>
    </PageContainer>
  )
}



function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? ''
}
