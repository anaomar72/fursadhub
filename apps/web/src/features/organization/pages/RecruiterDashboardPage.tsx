import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as opportunityApi from '../../opportunities/api/opportunityApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { useOrganizationCandidates } from '../hooks/useOrganizationCandidates'
import { PIPELINE_STAGE_TONE, closedCount, pipelineColumns } from '../candidatePipeline'
import { activeOpportunityCount } from '../organizationMetrics'
import { liveOffers, needsAttention, opportunityLoad, recruiterQueues } from '../recruiterMetrics'
import {
  Alert,
  Card,
  DashboardActionCard,
  Icon,
  LoadingState,
  StatusBadge,
  type IconName,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

const PANEL_LIMIT = 5

/**
 * The home screen for a {@code RECRUITER}.
 *
 * <p>Not the admin dashboard with tiles removed — a different dashboard, because a recruiter's job
 * is different. The admin view answers "how is my organization doing" and includes the institution
 * record, staff and partner universities; a recruiter administers none of those
 * ({@code UpdateOrganizationService} and {@code OrganizationMembershipService} both require
 * {@code ORGANIZATION_ADMIN}). What a recruiter has is the full recruiting surface, so this page is
 * built entirely around the two questions that fill their day: who is waiting on me, and who am I
 * waiting on.
 *
 * <p>Every figure is counted from list endpoints the caller is already authorized to read —
 * {@code GET /organizations/{id}/opportunities} and one candidate pool per recruiting internship.
 * There is no organization-wide candidacy endpoint, so the pools are read individually and the page
 * says plainly how many it checked (see {@code useOrganizationCandidates}).
 *
 * <p>Layout, spacing, card treatment and status language follow the approved organization design
 * (11_organization_dashboard_clean.png) and reuse the same shared components as the admin
 * dashboard, so the two read as one product.
 */
export function RecruiterDashboardPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'organization', organizationId],
    queryFn: () => opportunityApi.listOrganizationOpportunities(organizationId),
    retry: false,
  })

  const opportunities = opportunitiesQuery.data ?? []
  const pools = useOrganizationCandidates(opportunities, !opportunitiesQuery.isLoading)

  if (opportunitiesQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const queues = recruiterQueues(pools.rows)
  const attention = needsAttention(pools.rows, PANEL_LIMIT)
  const offers = liveOffers(pools.rows, PANEL_LIMIT)
  const load = opportunityLoad(pools.rows)
  const columns = pipelineColumns(queues.all)
  const loading = pools.isLoading

  return (
    <PageContainer className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-navy dark:text-foreground sm:text-3xl">
          {t('organization:recruiterDashboard.title')}
        </h1>
        <p className="mt-1.5 text-sm text-foreground-secondary">{t('organization:recruiterDashboard.subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="briefcase"
          tone="brand"
          label={t('organization:recruiterDashboard.activeInternships')}
          value={activeOpportunityCount(opportunities)}
          to="/organization/opportunities"
        />
        <MetricCard
          icon="users"
          tone="violet"
          label={t('organization:recruiterDashboard.newApplications')}
          value={loading ? '—' : queues.newApplications.length}
          to="/organization/candidates?stage=SUBMITTED"
        />
        <MetricCard
          icon="userCheck"
          tone="teal"
          label={t('organization:recruiterDashboard.shortlisted')}
          value={loading ? '—' : queues.shortlisted.length}
          to="/organization/candidates?stage=SHORTLISTED"
        />
        <MetricCard
          icon="clipboard"
          tone="amber"
          label={t('organization:recruiterDashboard.awaitingCandidate')}
          value={loading ? '—' : queues.awaitingCandidate.length}
          to="/organization/candidates?stage=OFFERED"
        />
      </div>

      {pools.hasErrors && <Alert tone="warning">{t('organization:dashboard.partialError')}</Alert>}

      {!loading && (queues.awaitingReview.length > 0 || queues.awaitingCandidate.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardActionCard
            label={t('organization:recruiterDashboard.awaitingReview')}
            value={queues.awaitingReview.length}
            to="/organization/candidates"
            statusLabel={
              queues.awaitingReview.length > 0
                ? t('organization:dashboard.needsAction')
                : t('organization:dashboard.clear')
            }
            tone={queues.awaitingReview.length > 0 ? 'warning' : 'success'}
          />
          <DashboardActionCard
            label={t('organization:recruiterDashboard.awaitingCandidate')}
            value={queues.awaitingCandidate.length}
            to="/organization/candidates?stage=OFFERED"
            statusLabel={t('organization:recruiterDashboard.waitingOnStudent')}
            tone="info"
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('organization:recruiterDashboard.needsAttention')}
            action={
              <Link to="/organization/candidates" className="text-sm font-semibold text-link hover:underline">
                {t('organization:dashboard.viewAll')}
              </Link>
            }
          />
          <p className="border-b border-border px-5 py-2 text-xs text-muted">
            {t('organization:recruiterDashboard.needsAttentionHint')}
          </p>
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('common:status.loading')}</p>
          ) : attention.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
              {t('organization:recruiterDashboard.nothingWaiting')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {attention.map(({ candidate, opportunityTitle }) => (
                <li key={candidate.candidacyId} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info">
                    <Icon name="user" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/organization/candidacies/${candidate.candidacyId}`}
                      className="block truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {opportunityTitle} · {t('organization:recruiterDashboard.appliedOn', { date: formatDate(candidate.createdAt) })}
                    </span>
                  </span>
                  <StatusBadge tone={PIPELINE_STAGE_TONE[candidate.status]}>
                    {t(`recruitment:candidacyStatusValues.${candidate.status}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('organization:recruiterDashboard.liveOffers')}
            action={
              <Link
                to="/organization/candidates?stage=OFFERED"
                className="text-sm font-semibold text-link hover:underline"
              >
                {t('organization:dashboard.viewAll')}
              </Link>
            }
          />
          <p className="border-b border-border px-5 py-2 text-xs text-muted">
            {t('organization:recruiterDashboard.liveOffersHint')}
          </p>
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">{t('common:status.loading')}</p>
          ) : offers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
              {t('organization:recruiterDashboard.noLiveOffers')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {offers.map(({ candidate, opportunityTitle }) => (
                <li key={candidate.candidacyId} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/organization/candidacies/${candidate.candidacyId}`}
                      className="block truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
                    </Link>
                    <span className="block truncate text-xs text-muted">{opportunityTitle}</span>
                  </span>
                  <StatusBadge tone="warning">
                    {t('organization:recruiterDashboard.respondBy', {
                      date: formatDate(candidate.liveOffer!.responseDeadline),
                    })}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {!loading && (
        <Card padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
                {t('organization:dashboard.candidatePipeline')}
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                {pools.notScanned > 0
                  ? t('organization:dashboard.pipelineHintPartial', {
                      scanned: pools.rows.length,
                      total: pools.totalInScope,
                    })
                  : t('organization:dashboard.pipelineHint', { count: pools.totalInScope })}
              </p>
            </div>
            <Link to="/organization/candidates" className="shrink-0 text-sm font-semibold text-link hover:underline">
              {t('organization:dashboard.viewAll')}
            </Link>
          </div>

          {/* Horizontally scrollable rather than wrapping: six columns will not fit a phone, and the
              longer Somali stage names must not push the page wider than the viewport. */}
          <div className="-mx-5 mt-5 overflow-x-auto px-5">
            <ul className="flex min-w-max gap-3" aria-label={t('organization:dashboard.candidatePipeline')}>
              {columns.map((column) => (
                <li key={column.status}>
                  {/* Each column links to the same stage filter the metric cards use, so the board
                      is a way into the work rather than a read-only summary of it. */}
                  <Link
                    to={`/organization/candidates?stage=${column.status}`}
                    className="block w-44 rounded-lg border border-border bg-surface-muted p-4 transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none motion-reduce:hover:transform-none"
                  >
                    <StatusBadge tone={PIPELINE_STAGE_TONE[column.status]}>
                      {t(`recruitment:candidacyStatusValues.${column.status}`)}
                    </StatusBadge>
                    <span className="mt-3 block text-2xl font-bold leading-none text-brand-navy dark:text-foreground">
                      {column.candidates.length}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {t('organization:dashboard.candidateCount', { count: column.candidates.length })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
            {t('organization:dashboard.pipelineClosed', { count: closedCount(queues.all) })}
          </p>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        <SectionHeading
          title={t('organization:recruiterDashboard.internshipLoad')}
          action={
            <Link to="/organization/opportunities" className="text-sm font-semibold text-link hover:underline">
              {t('organization:dashboard.viewAll')}
            </Link>
          }
        />
        {load.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
            {t('organization:dashboard.noActivePosts')}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {load.slice(0, PANEL_LIMIT).map((row) => (
              <li key={row.opportunityId} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info">
                  <Icon name="briefcase" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    to={`/organization/opportunities/${row.opportunityId}/candidates`}
                    className="block truncate text-sm font-semibold text-foreground hover:underline"
                  >
                    {row.title}
                  </Link>
                  <span className="block truncate text-xs text-muted">
                    {t('organization:dashboard.applicationCount', { count: row.total })}
                  </span>
                </span>
                {row.awaitingReview > 0 && (
                  <StatusBadge tone="warning">
                    {t('organization:recruiterDashboard.awaitingCount', { count: row.awaitingReview })}
                  </StatusBadge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
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

/** The same tile the admin and university dashboards use — one product, one dashboard language. */
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
  value: number | string
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
        {t('organization:dashboard.viewAll')}
      </Link>
    </Card>
  )
}
