import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as studentApi from '../api/studentApi'
import * as documentsApi from '../api/documentsApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import * as placementsApi from '../../placements/api/placementsApi'
import * as publicOpportunityApi from '../../opportunities/api/publicOpportunityApi'
import { CANDIDACY_STATUS_TONE } from '../../recruitment/components/statusTone'
import { ACTIVE_CANDIDACY_STATUSES, readinessPercent, readinessSteps } from '../studentReadiness'
import {
  Card,
  Icon,
  LoadingState,
  ProgressIndicator,
  StatusBadge,
  type IconName,
} from '../../../components/ui'
import { METRIC_TONES } from '../../../components/ui/metricTones'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

const LIVE_PLACEMENT_STATUSES = new Set(['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'])

/**
 * The student's home (design reference 10_student_dashboard_clean.png): a greeting, four counters,
 * open internships, their latest applications, and how close they are to being able to take part.
 *
 * <p>Every number is counted from an endpoint the student's own pages already use — there is no
 * dashboard aggregate on the backend and none is invented here. Where the approved design shows a
 * metric FursadHub has no concept of (saved internships), the card keeps its shape and carries a
 * real one instead (nominations awaiting the student's consent).
 */
export function DashboardPage() {
  const { t } = useTranslation()

  const profileQuery = useQuery({ queryKey: ['student', 'profile'], queryFn: studentApi.getMyProfile, retry: false })
  const enrollmentQuery = useQuery({ queryKey: ['student', 'enrollment'], queryFn: studentApi.getMyEnrollment, retry: false })
  const cvQuery = useQuery({ queryKey: ['student', 'cv'], queryFn: documentsApi.getMyCv, retry: false })
  const candidaciesQuery = useQuery({ queryKey: ['student', 'candidacies'], queryFn: recruitmentApi.listMyCandidacies })
  const nominationsQuery = useQuery({ queryKey: ['student', 'nominations'], queryFn: recruitmentApi.listMyNominations })
  const offersQuery = useQuery({ queryKey: ['student', 'offers'], queryFn: recruitmentApi.listMyOffers })
  const placementsQuery = useQuery({ queryKey: ['student', 'placements'], queryFn: placementsApi.listMyPlacements })
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
    hasCv: cvQuery.data?.present ?? false,
    enrollment: enrollmentQuery.data ?? null,
  })
  const percent = readinessPercent(steps)
  const nextStep = steps.find((step) => !step.done) ?? null

  const recentApplications = [...candidacies]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
  const openRoles = openRolesQuery.data?.content ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-navy dark:text-foreground sm:text-3xl">
          {t('student:dashboard.greeting', { name: firstName(profileQuery.data?.fullName) })}
        </h1>
        <p className="mt-1.5 text-sm text-foreground-secondary">{t('student:dashboard.greetingSubtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="clipboard"
          tone="brand"
          label={t('student:dashboard.applications')}
          value={activeApplications}
          to="/student/applications"
        />
        <MetricCard
          icon="users"
          tone="violet"
          label={t('student:dashboard.interviews')}
          value={interviews}
          to="/student/applications"
        />
        <MetricCard
          icon="userCheck"
          tone="teal"
          label={t('student:dashboard.nominations')}
          value={pendingNominations}
          to="/student/nominations"
        />
        <MetricCard
          icon="badgeCheck"
          tone="amber"
          label={t('student:dashboard.offers')}
          value={pendingOffers}
          to="/student/applications"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('student:dashboard.openInternships')}
            action={<Link to="/student/opportunities" className="text-sm font-semibold text-link hover:underline">{t('student:dashboard.viewAll')}</Link>}
          />
          {openRolesQuery.isError ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('opportunities:public.error')}</p>
          ) : openRoles.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('opportunities:public.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {openRoles.map((opportunity) => (
                <li key={opportunity.id}>
                  <Link
                    to={`/student/opportunities/${opportunity.id}`}
                    className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring motion-reduce:transition-none"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                      <Icon name="briefcase" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-foreground">{opportunity.title}</span>
                      <span className="mt-0.5 block truncate text-sm text-foreground-secondary">
                        {opportunity.organization.name}
                        {opportunity.location ? ` · ${opportunity.location}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted">
                      {t(`opportunities:workModeValues.${opportunity.workMode}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card padding="none" className="overflow-hidden">
            <SectionHeading
              title={t('student:dashboard.recentApplications')}
              action={<Link to="/student/applications" className="text-sm font-semibold text-link hover:underline">{t('student:dashboard.viewAll')}</Link>}
            />
            {recentApplications.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-foreground-secondary">{t('recruitment:applications.empty')}</p>
                <Link
                  to="/student/opportunities"
                  className="mt-3 inline-flex h-9 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-blue-strong motion-reduce:transition-none"
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
            <Card padding="lg">
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
                className="mt-4 inline-block text-sm font-semibold text-link hover:underline"
              >
                {t('student:dashboard.openPlacement')}
              </Link>
            </Card>
          ) : (
            <Card padding="lg">
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
      </div>
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
        {t('student:dashboard.viewAll')}
      </Link>
    </Card>
  )
}

function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? ''
}
