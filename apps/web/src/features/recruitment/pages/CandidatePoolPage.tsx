import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { CANDIDACY_STATUS_TONE } from '../components/statusTone'
import { LoadingSpinner, StatusBadge } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'
import type { CandidacySource } from '../types'

const SOURCE_FILTERS: (CandidacySource | 'ALL')[] = ['ALL', 'SELF_APPLICATION', 'UNIVERSITY_NOMINATION']

/**
 * The organization's candidate pool for one opportunity (CLAUDE.md Phase 4 section 27).
 *
 * <p>This is deliberately ONE list. Applicants and nominees are not separate pipelines — they are
 * the same candidates, and the source filter is a view over that single pool. A BOTH candidate
 * appears under either filter, which is why the source is also shown per row.
 */
export function CandidatePoolPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const [source, setSource] = useState<CandidacySource | 'ALL'>('ALL')

  const candidatesQuery = useQuery({
    queryKey: ['recruitment', 'candidates', opportunityId, source],
    queryFn: () => recruitmentApi.listCandidates(opportunityId!, source === 'ALL' ? undefined : source),
    enabled: !!opportunityId,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{t('recruitment:pool.title')}</h1>
        <Link
          to={`/organization/opportunities/${opportunityId}`}
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          {t('recruitment:pool.backToOpportunity')}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('recruitment:pool.filterLabel')}>
        {SOURCE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={source === filter}
            onClick={() => setSource(filter)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              source === filter ? 'bg-brand-primary text-on-brand' : 'text-foreground-secondary hover:bg-surface-muted',
            )}
          >
            {filter === 'ALL' ? t('recruitment:pool.allSources') : t(`recruitment:sourceValues.${filter}`)}
          </button>
        ))}
      </div>

      {candidatesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (candidatesQuery.data?.length ?? 0) === 0 ? (
        <p className="mt-10 text-center text-sm text-foreground-secondary">{t('recruitment:pool.empty')}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {candidatesQuery.data?.map((candidate) => (
            <li key={candidate.candidacyId} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/organization/candidacies/${candidate.candidacyId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
                  </Link>
                  <p className="mt-1 text-xs text-foreground-secondary">
                    {t(`recruitment:sourceValues.${candidate.source}`)}
                  </p>
                </div>
                <StatusBadge tone={CANDIDACY_STATUS_TONE[candidate.status]}>
                  {t(`recruitment:candidacyStatusValues.${candidate.status}`)}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
