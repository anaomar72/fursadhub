import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as opportunityApi from '../../opportunities/api/opportunityApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { organizationCapabilities } from '../organizationCapabilities'
import { RecruiterDashboardPage } from './RecruiterDashboardPage'
import { SupervisorDashboardPage } from './SupervisorDashboardPage'
import { useOrganizationCandidates } from '../hooks/useOrganizationCandidates'
import {
  PIPELINE_STAGE_TONE,
  closedCount,
  pipelineColumns,
} from '../candidatePipeline'
import {
  OPPORTUNITY_STATUS_ORDER,
  activeOpportunityCount,
  allCandidates,
  countByOpportunityStatus,
  currentInternCount,
  placementsMissingSupervisor,
  recentApplications,
} from '../organizationMetrics'
import { OPPORTUNITY_STATUS_TONE } from '../../opportunities/components/statusTone'
import { PLACEMENT_STATUS_TONE } from '../../placements/components/statusTone'
import {
  Alert,
  Card,
  DashboardActionCard,
  Icon,
  LoadingState,
  StatusBadge,
  StatusDistribution,
  type IconName,
} from '../../../components/ui'
import { METRIC_TONES } from '../../../components/ui/metricTones'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

const RECENT_LIMIT = 5

/**
 * The organization's home, built to the approved design (11_organization_dashboard_clean.png):
 * four stat cards, recent applications beside the active internship posts, and the candidate
 * pipeline across the bottom.
 *
 * <p>Every figure is counted from a list endpoint the caller is already authorized to read — see
 * organizationMetrics.ts and useOrganizationCandidates.ts. The prototype's numbers are all
 * placeholders, and three of its four stat cards needed re-sourcing rather than re-labelling:
 *
 * <ul>
 *   <li><strong>Applications</strong> counts real candidacies across the opportunities actually
 *       being recruited for, not a global figure the API cannot produce.</li>
 *   <li><strong>Shortlisted</strong> is the real {@code SHORTLISTED} state.</li>
 *   <li><strong>Hired</strong> has no backing concept, so it counts interns actually on site —
 *       placements in {@code ACTIVE}/{@code COMPLETION_PENDING} — which is the number an
 *       organization would want from that tile anyway.</li>
 * </ul>
 *
 * <p>A supervisor never reaches the recruiting half of this page: {@code CandidacyAuthorization}
 * refuses the role outright, so those queries are not issued at all rather than rendered as zeros.
 */
export function DashboardPage() {
  const membership = useOrganizationMembership()

  // A recruiter gets their OWN dashboard rather than this one with tiles switched off. This page is
  // built around how the organization is doing — its institution record, its staff, its partner
  // universities — and a recruiter administers none of that. Theirs is a recruitment workspace
  // (CLAUDE.md section 24: a role's portal reflects what the role can actually do).
  const can = organizationCapabilities(membership)
  if (can.isRecruiter) {
    return <RecruiterDashboardPage />
  }
  // A supervisor gets their own dashboard too. This page reads the organization's opportunities and
  // candidate pools; a supervisor can read neither, so rendering it for them showed "Active
  // internships: 0" and "Applications: 0" — zeros that look like facts but are really endpoints the
  // role cannot reach (CLAUDE.md section 24: fail closed, never fabricate).
  if (can.scopedToAssignedPlacements) {
    return <SupervisorDashboardPage />
  }
  return <AdminDashboard />
}

/** The organization admin's dashboard: the whole organization, not just its recruiting. */
function AdminDashboard() {
  const { t } = useTranslation()
  const membership = useOrganizationMembership()
  const { organizationId } = membership
  const can = organizationCapabilities(membership)

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'organization', organizationId],
    queryFn: () => opportunityApi.listOrganizationOpportunities(organizationId),
    enabled: !can.scopedToAssignedPlacements,
    retry: false,
  })
  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(organizationId),
    retry: false,
  })

  const opportunities = opportunitiesQuery.data ?? []
  const placements = placementsQuery.data ?? []

  // Fanned out only once the opportunity list is in, and only for a role the pool admits.
  const pools = useOrganizationCandidates(
    opportunities,
    can.canManageCandidates && !opportunitiesQuery.isLoading,
  )

  if (placementsQuery.isLoading || (can.canManageCandidates && opportunitiesQuery.isLoading)) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const candidates = allCandidates(pools.rows)
  const shortlisted = candidates.filter((candidate) => candidate.status === 'SHORTLISTED').length
  const columns = pipelineColumns(candidates)
  const recent = recentApplications(pools.rows, RECENT_LIMIT)
  const unsupervised = placementsMissingSupervisor(placements)
  const statusCounts = countByOpportunityStatus(opportunities)
  const draftCount = statusCounts.DRAFT

  // Application counts per opportunity, for the "Active internship posts" panel.
  const applicationsByOpportunity = new Map(pools.rows.map((row) => [row.opportunity.id, row.candidates.length]))
  const activePosts = opportunities
    .filter((opportunity) => opportunity.status === 'PUBLISHED')
    .sort((a, b) => (applicationsByOpportunity.get(b.id) ?? 0) - (applicationsByOpportunity.get(a.id) ?? 0))

  return (
    <PageContainer className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-navy dark:text-foreground sm:text-3xl">
          {t('organization:dashboard.title')}
        </h1>
        <p className="mt-1.5 text-sm text-foreground-secondary">{t('organization:dashboard.subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="briefcase"
          tone="brand"
          label={t('organization:dashboard.activeInternships')}
          value={activeOpportunityCount(opportunities)}
          to="/organization/opportunities"
        />
        <MetricCard
          icon="users"
          tone="violet"
          label={t('organization:dashboard.applications')}
          value={pools.isLoading ? '—' : candidates.length}
          to="/organization/candidates"
        />
        <MetricCard
          icon="userCheck"
          tone="teal"
          label={t('organization:dashboard.shortlisted')}
          value={pools.isLoading ? '—' : shortlisted}
          to="/organization/candidates"
        />
        <MetricCard
          icon="badgeCheck"
          tone="amber"
          label={t('organization:dashboard.currentInterns')}
          value={currentInternCount(placements)}
          to="/organization/placements"
        />
      </div>

      {pools.hasErrors && <Alert tone="warning">{t('organization:dashboard.partialError')}</Alert>}

      {/* The things that are actually somebody's job today. */}
      {(draftCount > 0 || unsupervised.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {draftCount > 0 && (
            <DashboardActionCard
              label={t('organization:dashboard.draftOpportunities')}
              value={draftCount}
              to="/organization/opportunities"
              statusLabel={t('organization:dashboard.needsPublishing')}
              tone="warning"
            />
          )}
          {unsupervised.length > 0 && (
            <DashboardActionCard
              label={t('organization:dashboard.needsSupervisor')}
              value={unsupervised.length}
              to="/organization/placements"
              statusLabel={t('organization:dashboard.needsAction')}
              tone="warning"
            />
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {can.canManageCandidates && (
          <Card padding="none" className="overflow-hidden">
            <SectionHeading
              title={t('organization:dashboard.recentApplications')}
              action={
                <Link to="/organization/candidates" className="text-sm font-semibold text-link hover:underline">
                  {t('organization:dashboard.viewAll')}
                </Link>
              }
            />
            {recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
                {t('organization:dashboard.noApplications')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map(({ candidate, opportunity }) => (
                  <li key={candidate.candidacyId} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
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
                        {opportunity.title} · {formatDate(candidate.createdAt)}
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
        )}

        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('organization:dashboard.activePosts')}
            action={
              <Link to="/organization/opportunities" className="text-sm font-semibold text-link hover:underline">
                {t('organization:dashboard.viewAll')}
              </Link>
            }
          />
          {activePosts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
              {t('organization:dashboard.noActivePosts')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activePosts.slice(0, RECENT_LIMIT).map((opportunity) => (
                <li key={opportunity.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                    <Icon name="briefcase" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/organization/opportunities/${opportunity.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {opportunity.title}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {t(`opportunities:workModeValues.${opportunity.workMode}`)} ·{' '}
                      {t(`opportunities:modeValues.${opportunity.mode}`)}
                      {can.canManageCandidates && !pools.isLoading && (
                        <>
                          {' · '}
                          {t('organization:dashboard.applicationCount', {
                            count: applicationsByOpportunity.get(opportunity.id) ?? 0,
                          })}
                        </>
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {can.canManageCandidates && !pools.isLoading && (
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
                <li key={column.status} className="w-44 shrink-0 rounded-lg border border-border bg-surface-muted p-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={PIPELINE_STAGE_TONE[column.status]}>
                      {t(`recruitment:candidacyStatusValues.${column.status}`)}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-2xl font-bold leading-none text-brand-navy dark:text-foreground">
                    {column.candidates.length}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t('organization:dashboard.candidateCount', { count: column.candidates.length })}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
            {t('organization:dashboard.pipelineClosed', { count: closedCount(candidates) })}
          </p>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('organization:dashboard.internshipOverview')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('organization:dashboard.internshipOverviewHint')}</p>
          <StatusDistribution
            className="mt-5"
            label={t('organization:dashboard.internshipOverview')}
            emptyLabel={t('organization:dashboard.noOpportunities')}
            items={OPPORTUNITY_STATUS_ORDER.map((status) => ({
              id: status,
              label: t(`opportunities:statusValues.${status}`),
              value: statusCounts[status],
              tone: OPPORTUNITY_STATUS_TONE[status],
            }))}
          />
        </Card>

        <Card padding="none" className="overflow-hidden">
          <SectionHeading
            title={t('organization:dashboard.currentInternsTitle')}
            action={
              <Link to="/organization/placements" className="text-sm font-semibold text-link hover:underline">
                {t('organization:dashboard.viewAll')}
              </Link>
            }
          />
          {placements.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-secondary">
              {t('placements:organization.empty')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {placements.slice(0, RECENT_LIMIT).map((placement) => (
                <li key={placement.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/organization/placements/${placement.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {placement.studentFullName ?? placement.studentEmail ?? placement.studentUserId}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {placement.universityName ?? ''} ·{' '}
                      {t('placements:detail.dateRange', {
                        start: formatDate(placement.startDate),
                        end: formatDate(placement.endDate),
                      })}
                    </span>
                  </span>
                  <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>
                    {t(`placements:statusValues.${placement.status}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
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

/** The same tile the university dashboards use — one product, one dashboard language. */
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
