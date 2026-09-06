import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import * as studentApi from '../../student/api/studentApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { applyBlocker } from '../../student/studentReadiness'
import {
  Alert,
  Badge,
  Card,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  VerifiedBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

/**
 * One internship, as the student sees it inside their own shell.
 *
 * <p>The call to action reflects the REAL rules the API applies on submit — verified enrollment,
 * no live placement, no existing candidacy, an open deadline ({@code StudentEligibility},
 * {@code OpportunityApplicationRules}) — so a student learns why they cannot apply before spending
 * a request on it. None of that is a decision: the backend evaluates the same rules again and
 * refuses regardless of what this page rendered (CLAUDE.md section 24).
 */
export function StudentOpportunityDetailPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()

  const opportunityQuery = useQuery({
    queryKey: ['public-opportunities', 'detail', opportunityId],
    queryFn: () => publicOpportunityApi.getPublicOpportunity(opportunityId!),
    enabled: !!opportunityId,
    retry: false,
  })
  const enrollmentQuery = useQuery({ queryKey: ['student', 'enrollment'], queryFn: studentApi.getMyEnrollment, retry: false })
  const candidaciesQuery = useQuery({ queryKey: ['student', 'candidacies'], queryFn: recruitmentApi.listMyCandidacies, retry: false })
  const placementsQuery = useQuery({ queryKey: ['student', 'placements'], queryFn: placementsApi.listMyPlacements, retry: false })

  if (opportunityQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('opportunities:public.loading')} />
      </PageContainer>
    )
  }

  if (opportunityQuery.isError || !opportunityQuery.data) {
    return (
      <PageContainer>
        <ErrorState title={t('opportunities:public.notFound')} />
        <Link to="/student/opportunities" className="mt-4 inline-block text-sm font-semibold text-link hover:underline">
          {t('opportunities:browse.backToList')}
        </Link>
      </PageContainer>
    )
  }

  const opportunity = opportunityQuery.data
  const existingCandidacy = (candidaciesQuery.data ?? []).find(
    (candidacy) => candidacy.opportunityId === opportunity.id,
  )
  const blocker = applyBlocker({
    enrollment: enrollmentQuery.data ?? null,
    placements: placementsQuery.data ?? [],
    candidacies: candidaciesQuery.data ?? [],
    opportunity,
  })

  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <Link to="/student/opportunities" className="inline-flex items-center gap-1 text-sm font-medium text-foreground-secondary hover:text-foreground">
          <Icon name="chevronLeft" className="size-4" />
          {t('opportunities:browse.backToList')}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/organizations/${opportunity.organization.id}`}
                className="text-sm font-semibold text-foreground-secondary hover:text-foreground hover:underline"
              >
                {opportunity.organization.name}
              </Link>
              {opportunity.organization.verified && <VerifiedBadge />}
            </div>
            <PageHeader className="mt-2" title={opportunity.title} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="brand">{t(`opportunities:workModeValues.${opportunity.workMode}`)}</Badge>
              {opportunity.location && <Badge>{opportunity.location}</Badge>}
              <Badge>{t('opportunities:browse.openings', { count: opportunity.numberOfOpenings })}</Badge>
            </div>
          </div>

          <Section title={t('opportunities:form.descriptionLabel')} body={opportunity.description} />
          {opportunity.responsibilities && (
            <Section title={t('opportunities:form.responsibilitiesLabel')} body={opportunity.responsibilities} />
          )}
          {opportunity.requirements && (
            <Section title={t('opportunities:form.requirementsLabel')} body={opportunity.requirements} />
          )}
        </div>

        <Card padding="lg" className="lg:sticky lg:top-24">
          <dl className="flex flex-col gap-3 text-sm">
            <Row label={t('opportunities:form.startDateLabel')} value={formatDate(opportunity.startDate)} />
            <Row label={t('opportunities:form.endDateLabel')} value={formatDate(opportunity.endDate)} />
            {opportunity.applicationDeadline && (
              <Row
                label={t('opportunities:form.applicationDeadlineLabel')}
                value={formatDate(opportunity.applicationDeadline)}
              />
            )}
          </dl>

          <div className="mt-5 border-t border-border pt-5">
            {existingCandidacy ? (
              <div className="flex flex-col gap-3">
                <Alert tone="info">{t('opportunities:browse.blockers.STUDENT_ALREADY_APPLIED')}</Alert>
                <Link
                  to={`/student/applications/${existingCandidacy.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-brand-primary px-5 text-sm font-semibold text-brand-accent-ink transition-colors hover:bg-brand-blue-soft motion-reduce:transition-none dark:border-info dark:text-info dark:hover:bg-info-bg"
                >
                  {t('opportunities:browse.viewApplication')}
                </Link>
              </div>
            ) : blocker ? (
              <div className="flex flex-col gap-3">
                <Alert tone={blocker === 'OPPORTUNITY_DEADLINE_PASSED' ? 'warning' : 'warning'}>
                  {t(`opportunities:browse.blockers.${blocker}`)}
                </Alert>
                {blocker === 'STUDENT_NOT_VERIFIED' && (
                  <Link
                    to="/student/enrollment"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-brand-primary px-5 text-sm font-semibold text-brand-accent-ink transition-colors hover:bg-brand-blue-soft motion-reduce:transition-none dark:border-info dark:text-info dark:hover:bg-info-bg"
                  >
                    {t('opportunities:browse.goToEnrollment')}
                  </Link>
                )}
                {blocker === 'STUDENT_NOT_AVAILABLE' && (
                  <Link
                    to="/student/placements"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-brand-primary px-5 text-sm font-semibold text-brand-accent-ink transition-colors hover:bg-brand-blue-soft motion-reduce:transition-none dark:border-info dark:text-info dark:hover:bg-info-bg"
                  >
                    {t('opportunities:browse.goToPlacement')}
                  </Link>
                )}
              </div>
            ) : (
              <Link
                to={`/student/opportunities/${opportunity.id}/apply`}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-on-brand shadow-sm transition-colors hover:bg-brand-blue-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
              >
                {t('opportunities:public.apply')}
              </Link>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground-secondary">{body}</p>
    </section>
  )
}
