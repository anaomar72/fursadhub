import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as opportunityApi from '../../opportunities/api/opportunityApi'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { useOrganizationCandidates } from '../../organization/hooks/useOrganizationCandidates'
import { allCandidates } from '../../organization/organizationMetrics'
import { PIPELINE_STAGES } from '../../organization/candidatePipeline'
import { CandidateBoard } from '../components/CandidateBoard'
import { CandidateTable } from './CandidatePoolPage'
import {
  Alert,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SearchInput,
  Select,
  Tabs,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

const VIEWS = ['board', 'list'] as const
type View = (typeof VIEWS)[number]

/**
 * Every candidate across the internships this organization is currently recruiting for.
 *
 * <p>The API has no organization-wide candidacy endpoint — the pool is addressed per opportunity —
 * so this reads one pool per recruiting opportunity and says plainly how many it checked. It never
 * asks about an opportunity that was not in the organization's own list, and
 * {@code CandidacyAuthorization} re-authorizes every request regardless, so this is a convenience
 * over the same boundary rather than a way around it (CLAUDE.md section 24).
 *
 * <p>DRAFT and CLOSED/CANCELLED internships are not scanned: a draft has never been open to
 * applicants, so querying it can only come back empty.
 */
export function OrganizationCandidatesPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()
  const [view, setView] = useState<View>('board')
  const [opportunityFilter, setOpportunityFilter] = useState('')
  const [search, setSearch] = useState('')

  /**
   * The stage filter lives in the URL rather than in component state.
   *
   * <p>That is what makes "Shortlist" a real destination: it is `?stage=SHORTLISTED` over this
   * same pool, not a separate entity or a second list. FursadHub has no shortlist table — being
   * shortlisted IS the `SHORTLISTED` candidacy status (CLAUDE.md section 37) — so the honest way
   * to offer a shortlist view is to filter on that status, in a link a recruiter can bookmark and
   * share.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('stage') ?? ''
  const setStatus = (next: string) => {
    setSearchParams(
      (params) => {
        if (next) params.set('stage', next)
        else params.delete('stage')
        return params
      },
      { replace: true },
    )
  }

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'organization', organizationId],
    queryFn: () => opportunityApi.listOrganizationOpportunities(organizationId),
  })

  const pools = useOrganizationCandidates(opportunitiesQuery.data ?? [], !opportunitiesQuery.isLoading)

  const titleFor = new Map(
    pools.rows.flatMap((row) => row.candidates.map((candidate) => [candidate.candidacyId, row.opportunity.title])),
  )
  const opportunityIdFor = new Map(
    pools.rows.flatMap((row) => row.candidates.map((candidate) => [candidate.candidacyId, row.opportunity.id])),
  )

  const term = search.trim().toLowerCase()
  const rows = allCandidates(pools.rows).filter((candidate) => {
    if (status && candidate.status !== status) return false
    if (opportunityFilter && opportunityIdFor.get(candidate.candidacyId) !== opportunityFilter) return false
    if (!term) return true
    return [candidate.studentFullName, candidate.studentEmail].some((value) => value?.toLowerCase().includes(term))
  })

  const scannedTitles = pools.rows.map((row) => row.opportunity)

  return (
    <PageContainer className="flex flex-col gap-6">
      {/* When a stage is pinned in the URL the page says so in its own title — a link to
          ?stage=SHORTLISTED should read as the shortlist, not as an unexplained partial list. */}
      <PageHeader
        eyebrow={t('recruitment:nav.candidates')}
        title={
          status
            ? t('recruitment:organizationPool.stageTitle', {
                stage: t(`recruitment:candidacyStatusValues.${status}`),
              })
            : t('recruitment:organizationPool.title')
        }
        description={
          status
            ? t('recruitment:organizationPool.stageSubtitle')
            : t('recruitment:organizationPool.subtitle')
        }
      />

      {opportunitiesQuery.isError ? (
        <ErrorState onRetry={() => void opportunitiesQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : opportunitiesQuery.isLoading || pools.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : pools.totalInScope === 0 ? (
        <EmptyState
          title={t('recruitment:organizationPool.noRecruiting')}
          description={t('recruitment:organizationPool.noRecruitingHint')}
        />
      ) : (
        <>
          <Tabs
            label={t('recruitment:pool.viewLabel')}
            value={view}
            onValueChange={(value) => setView(value as View)}
            items={VIEWS.map((id) => ({ id, label: t(`recruitment:pool.views.${id}`) }))}
          />

          <FilterBar
            search={
              <SearchInput
                label={t('recruitment:pool.searchLabel')}
                placeholder={t('recruitment:pool.searchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            }
          >
            <Select
              aria-label={t('recruitment:pool.internship')}
              className="sm:w-56"
              value={opportunityFilter}
              onChange={(event) => setOpportunityFilter(event.target.value)}
            >
              <option value="">{t('recruitment:organizationPool.allInternships')}</option>
              {scannedTitles.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t('recruitment:pool.statusLabel')}
              className="sm:w-48"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{t('recruitment:pool.allStatuses')}</option>
              {PIPELINE_STAGES.map((value) => (
                <option key={value} value={value}>
                  {t(`recruitment:candidacyStatusValues.${value}`)}
                </option>
              ))}
            </Select>
          </FilterBar>

          {pools.hasErrors && <Alert tone="warning">{t('recruitment:organizationPool.partialError')}</Alert>}

          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {pools.notScanned > 0
              ? t('recruitment:organizationPool.scannedPartial', {
                  scanned: pools.rows.length,
                  total: pools.totalInScope,
                })
              : t('recruitment:organizationPool.scanned', { count: pools.totalInScope })}
            {' · '}
            {t('recruitment:pool.resultCount', { count: rows.length })}
          </p>

          {view === 'board' ? (
            <CandidateBoard
              candidates={rows}
              opportunityTitle={(candidate) => titleFor.get(candidate.candidacyId)}
              emptyMessage={t('recruitment:pool.empty')}
            />
          ) : (
            <CandidateTable rows={rows} opportunityTitle={(candidate) => titleFor.get(candidate.candidacyId)} />
          )}
        </>
      )}
    </PageContainer>
  )
}
