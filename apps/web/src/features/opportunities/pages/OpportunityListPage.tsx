import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useOrganizationCandidates } from '../../organization/hooks/useOrganizationCandidates'
import { opportunityLoad, type OpportunityLoad } from '../../organization/recruiterMetrics'
import { useTranslation } from 'react-i18next'
import * as opportunityApi from '../api/opportunityApi'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { organizationCapabilities } from '../../organization/organizationCapabilities'
import { OPPORTUNITY_STATUS_TONE } from '../components/statusTone'
import {
  Badge,
  ButtonLink,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Icon,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import type { OpportunityMode, OpportunityResponse, OpportunityStatus } from '../types'

const STATUSES: OpportunityStatus[] = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'CANCELLED']
const MODES: OpportunityMode[] = ['PUBLIC', 'UNIVERSITY_TARGETED', 'HYBRID']

/**
 * The organization's internships.
 *
 * <p>`GET /organizations/{id}/opportunities` takes no query parameters and does not paginate
 * ({@code OrganizationOpportunityController}), so the search box and the two selects narrow the rows
 * that already arrived — real filters over real data, not a pretend server search, and no
 * pagination control for pagination the endpoint does not offer.
 *
 * <p>Mode is shown on every row and is filterable, because the three sourcing modes are genuinely
 * different products — a {@code UNIVERSITY_TARGETED} internship cannot be applied to directly and a
 * {@code PUBLIC} one has no nomination targets. Collapsing them into one undifferentiated list
 * would hide the distinction the whole recruitment model rests on (CLAUDE.md section 32).
 */
export function OpportunityListPage() {
  const { t } = useTranslation()
  const membership = useOrganizationMembership()
  const can = organizationCapabilities(membership)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('')

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'organization', membership.organizationId],
    queryFn: () => opportunityApi.listOrganizationOpportunities(membership.organizationId),
  })

  // Applicant counts per internship, from the same per-internship pools the dashboards read
  // (same query keys — usually already cached). Recruiting internships only; a draft has none.
  const pools = useOrganizationCandidates(opportunitiesQuery.data ?? [], can.canManageCandidates && opportunitiesQuery.isSuccess)
  const loadById = new Map(opportunityLoad(pools.rows).map((row) => [row.opportunityId, row]))

  const term = search.trim().toLowerCase()
  const rows = (opportunitiesQuery.data ?? []).filter((opportunity) => {
    if (status && opportunity.status !== status) return false
    if (mode && opportunity.mode !== mode) return false
    if (!term) return true
    return [opportunity.title, opportunity.location].some((value) => value?.toLowerCase().includes(term))
  })

  const columns: DataTableColumn<OpportunityResponse>[] = [
    {
      key: 'title',
      header: t('opportunities:list.internship'),
      render: (opportunity) => (
        <span className="block min-w-0">
          <Link
            to={`/organization/opportunities/${opportunity.id}`}
            className="block truncate font-medium text-foreground hover:text-link hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {opportunity.title}
          </Link>
          <span className="block truncate text-caption text-foreground-secondary">
            {[t(`opportunities:workModeValues.${opportunity.workMode}`), opportunity.location].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    },
    {
      key: 'mode',
      header: t('opportunities:list.mode'),
      render: (opportunity) => <Badge>{t(`opportunities:modeValues.${opportunity.mode}`)}</Badge>,
    },
    {
      key: 'dates',
      header: t('opportunities:list.dates'),
      render: (opportunity) => (
        <span className="block min-w-0">
          <span className="block whitespace-nowrap text-foreground-secondary">
            {t('placements:detail.dateRange', {
              start: formatDate(opportunity.startDate),
              end: formatDate(opportunity.endDate),
            })}
          </span>
          {opportunity.applicationDeadline && (
            <span className="block whitespace-nowrap text-xs text-muted">
              {t('opportunities:list.deadline', { date: formatDate(opportunity.applicationDeadline) })}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'candidates',
      header: t('opportunities:list.candidates'),
      render: (opportunity) => <CandidateFigure load={loadById.get(opportunity.id)} loading={pools.isLoading} />,
    },
    {
      key: 'status',
      header: t('opportunities:list.status'),
      render: (opportunity) => (
        <StatusBadge tone={OPPORTUNITY_STATUS_TONE[opportunity.status]}>
          {t(`opportunities:statusValues.${opportunity.status}`)}
        </StatusBadge>
      ),
    },
  ]

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('opportunities:list.title')}
        description={t('opportunities:list.subtitle')}
        actions={
          can.canManageOpportunities && (
            <ButtonLink to="/organization/opportunities/new">
              <Icon name="briefcase" className="size-4" />
              {t('opportunities:list.create')}
            </ButtonLink>
          )
        }
      />

      <FilterBar
        search={
          <SearchInput
            label={t('opportunities:list.searchLabel')}
            placeholder={t('opportunities:list.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        <Select
          aria-label={t('opportunities:list.status')}
          className="sm:w-44"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t('opportunities:list.allStatuses')}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`opportunities:statusValues.${value}`)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('opportunities:list.mode')}
          className="sm:w-52"
          value={mode}
          onChange={(event) => setMode(event.target.value)}
        >
          <option value="">{t('opportunities:list.allModes')}</option>
          {MODES.map((value) => (
            <option key={value} value={value}>
              {t(`opportunities:modeValues.${value}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {opportunitiesQuery.isError ? (
        <ErrorState onRetry={() => void opportunitiesQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : (
        <>
          {!opportunitiesQuery.isLoading && (
            <p className="text-body text-foreground-secondary" aria-live="polite">
              {t('opportunities:list.resultCount', { count: rows.length })}
            </p>
          )}
          <DataTable
            caption={t('opportunities:list.title')}
            columns={columns}
            rows={rows}
            loading={opportunitiesQuery.isLoading}
            rowKey={(opportunity) => opportunity.id}
            // Phones: one stacked row per internship — title, status, audience, dates, applicants —
            // instead of a table scrolled sideways.
            renderMobileRow={(opportunity) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/organization/opportunities/${opportunity.id}`}
                    className="min-w-0 break-words rounded-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {opportunity.title}
                  </Link>
                  <StatusBadge tone={OPPORTUNITY_STATUS_TONE[opportunity.status]}>{t(`opportunities:statusValues.${opportunity.status}`)}</StatusBadge>
                </div>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-foreground-secondary">
                  <Badge>{t(`opportunities:modeValues.${opportunity.mode}`)}</Badge>
                  {t('placements:detail.dateRange', { start: formatDate(opportunity.startDate), end: formatDate(opportunity.endDate) })}
                </p>
                <CandidateFigure load={loadById.get(opportunity.id)} loading={pools.isLoading} />
              </div>
            )}
            empty={
              <EmptyState
                title={t('opportunities:list.empty')}
                description={can.canManageOpportunities ? t('opportunities:list.emptyHint') : undefined}
                action={
                  can.canManageOpportunities ? (
                    <ButtonLink to="/organization/opportunities/new">
                      {t('opportunities:list.create')}
                    </ButtonLink>
                  ) : undefined
                }
              />
            }
          />
        </>
      )}
    </PageContainer>
  )
}

/** Applicants for one internship, and how many are waiting on the organization. */
function CandidateFigure({ load, loading }: { load: OpportunityLoad | undefined; loading: boolean }) {
  const { t } = useTranslation()
  if (!load) return <span className="text-caption text-foreground-secondary">{loading ? '…' : '—'}</span>
  return (
    <span className="block text-caption text-foreground-secondary">
      <span className="font-semibold text-foreground">{t('organization:workspace.work.applicants', { count: load.total })}</span>
      {load.awaitingReview > 0 && <> · {t('organization:workspace.work.awaiting', { count: load.awaitingReview })}</>}
    </span>
  )
}
