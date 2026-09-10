import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import * as opportunityApi from '../../opportunities/api/opportunityApi'
import { CANDIDACY_STATUS_TONE } from '../components/statusTone'
import { CandidateBoard } from '../components/CandidateBoard'
import { PIPELINE_STAGES, isClosed } from '../../organization/candidatePipeline'
import {
  Badge,
  Breadcrumbs,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  Tabs,
  type DataTableColumn,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import type { CandidacySource, CandidacyStatus, CandidateRowResponse } from '../types'

const SOURCES: CandidacySource[] = ['SELF_APPLICATION', 'UNIVERSITY_NOMINATION', 'BOTH']
const VIEWS = ['board', 'list'] as const
type View = (typeof VIEWS)[number]

/**
 * The organization's candidate pool for one internship (CLAUDE.md Phase 4 section 27).
 *
 * <p>This is deliberately ONE pool. Applicants and nominees are not separate pipelines — they are
 * the same candidates, and `source` is a view over that single pool, which is why a BOTH candidate
 * carries both origins on the same row rather than appearing twice.
 *
 * <p>Two presentations of the same data: the board groups by stage, the table sorts and scans. Both
 * are read-only — every stage change is a named command on the candidate's own page, because the
 * backend accepts nothing else.
 */
export function CandidatePoolPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const [view, setView] = useState<View>('board')
  const [source, setSource] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState('')

  const opportunityQuery = useQuery({
    queryKey: ['opportunities', 'detail', opportunityId],
    queryFn: () => opportunityApi.getOpportunity(opportunityId!),
    enabled: !!opportunityId,
  })

  // The source filter is sent to the server, because the endpoint genuinely supports it. Status and
  // search narrow what arrived — the endpoint offers neither, and faking them would be a lie.
  const candidatesQuery = useQuery({
    queryKey: ['recruitment', 'candidates', opportunityId, source || 'ALL'],
    queryFn: () => recruitmentApi.listCandidates(opportunityId!, (source || undefined) as CandidacySource | undefined),
    enabled: !!opportunityId,
  })

  const term = search.trim().toLowerCase()
  const rows = (candidatesQuery.data ?? []).filter((candidate) => {
    if (status && candidate.status !== status) return false
    if (!term) return true
    return [candidate.studentFullName, candidate.studentEmail].some((value) => value?.toLowerCase().includes(term))
  })

  return (
    <PageContainer className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('opportunities:list.title'), to: '/organization/opportunities' },
          {
            label: opportunityQuery.data?.title ?? t('recruitment:pool.title'),
            to: `/organization/opportunities/${opportunityId}`,
          },
          { label: t('recruitment:pool.title') },
        ]}
      />

      <PageHeader
        eyebrow={opportunityQuery.data?.title}
        title={t('recruitment:pool.title')}
        description={t('recruitment:pool.subtitle')}
      />

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
          aria-label={t('recruitment:pool.sourceLabel')}
          className="sm:w-56"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          <option value="">{t('recruitment:pool.allSources')}</option>
          {SOURCES.map((value) => (
            <option key={value} value={value}>
              {t(`recruitment:sourceValues.${value}`)}
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

      {candidatesQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : candidatesQuery.isError ? (
        <ErrorState onRetry={() => void candidatesQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('recruitment:pool.resultCount', { count: rows.length })}
          </p>
          {view === 'board' ? (
            <CandidateBoard candidates={rows} emptyMessage={t('recruitment:pool.empty')} />
          ) : (
            <CandidateTable rows={rows} />
          )}
        </>
      )}
    </PageContainer>
  )
}

/** The scannable view of the same pool. Shared shape with the org-wide candidates page. */
export function CandidateTable({
  rows,
  opportunityTitle,
}: {
  rows: CandidateRowResponse[]
  opportunityTitle?: (candidate: CandidateRowResponse) => string | undefined
}) {
  const { t } = useTranslation()

  const columns: DataTableColumn<CandidateRowResponse>[] = [
    {
      key: 'candidate',
      header: t('recruitment:pool.candidate'),
      render: (candidate) => (
        <span className="block min-w-0">
          <Link
            to={`/organization/candidacies/${candidate.candidacyId}`}
            className="block truncate font-medium text-foreground hover:text-link hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
          </Link>
          {candidate.studentFullName && candidate.studentEmail && (
            <span className="block truncate text-xs text-muted">{candidate.studentEmail}</span>
          )}
        </span>
      ),
    },
    ...(opportunityTitle
      ? [
          {
            key: 'opportunity',
            header: t('recruitment:pool.internship'),
            render: (candidate: CandidateRowResponse) => (
              <span className="text-foreground-secondary">{opportunityTitle(candidate) ?? '—'}</span>
            ),
          },
        ]
      : []),
    {
      key: 'source',
      header: t('recruitment:pool.source'),
      render: (candidate) => <Badge>{t(`recruitment:sourceValues.${candidate.source}`)}</Badge>,
    },
    {
      key: 'submitted',
      header: t('recruitment:pool.submitted'),
      render: (candidate) => (
        <span className="whitespace-nowrap text-foreground-secondary">{formatDate(candidate.createdAt)}</span>
      ),
    },
    {
      key: 'offer',
      header: t('recruitment:pool.liveOffer'),
      render: (candidate) =>
        candidate.liveOffer ? (
          <span className="whitespace-nowrap text-foreground-secondary">
            {t('recruitment:pool.offerRespondBy', { date: formatDate(candidate.liveOffer.responseDeadline) })}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: t('recruitment:pool.status'),
      render: (candidate) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge tone={CANDIDACY_STATUS_TONE[candidate.status]}>
            {t(`recruitment:candidacyStatusValues.${candidate.status}`)}
          </StatusBadge>
          {isClosed(candidate.status as CandidacyStatus) && (
            <span className="text-xs text-muted">{t('recruitment:pool.closed')}</span>
          )}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      caption={t('recruitment:pool.title')}
      columns={columns}
      rows={rows}
      rowKey={(candidate) => candidate.candidacyId}
      empty={<EmptyState title={t('recruitment:pool.empty')} description={t('recruitment:pool.emptyHint')} />}
    />
  )
}
