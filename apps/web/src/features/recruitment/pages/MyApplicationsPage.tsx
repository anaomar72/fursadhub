import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { CANDIDACY_STATUS_TONE } from '../components/statusTone'
import { ACTIVE_CANDIDACY_STATUSES } from '../../student/studentReadiness'
import type { CandidacyStatus } from '../types'
import {
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  StatusBadge,
  Tabs,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

type StatusFilter = 'all' | 'active' | 'offers' | 'closed'

const CLOSED_STATUSES = new Set<CandidacyStatus>([
  'REJECTED',
  'WITHDRAWN',
  'OFFER_DECLINED',
  'OFFER_EXPIRED',
])

/**
 * The student's own applications and nominations-turned-candidacies, in ONE list — mirroring the
 * unified pipeline on the backend (CLAUDE.md section 36). The `source` badge tells the student how
 * each one started.
 *
 * <p>`GET /students/me/candidacies` returns the whole list with no filter parameters, so the tabs
 * group what has already arrived rather than pretending to be server-side filters.
 */
export function MyApplicationsPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<StatusFilter>('all')

  const candidaciesQuery = useQuery({
    queryKey: ['student', 'candidacies'],
    queryFn: recruitmentApi.listMyCandidacies,
  })

  const candidacies = candidaciesQuery.data ?? []
  const counts = {
    all: candidacies.length,
    active: candidacies.filter((candidacy) => ACTIVE_CANDIDACY_STATUSES.has(candidacy.status)).length,
    offers: candidacies.filter((candidacy) => candidacy.liveOffer?.status === 'PENDING').length,
    closed: candidacies.filter((candidacy) => CLOSED_STATUSES.has(candidacy.status)).length,
  }

  const visible = candidacies.filter((candidacy) => {
    if (filter === 'active') return ACTIVE_CANDIDACY_STATUSES.has(candidacy.status)
    if (filter === 'offers') return candidacy.liveOffer?.status === 'PENDING'
    if (filter === 'closed') return CLOSED_STATUSES.has(candidacy.status)
    return true
  })

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('recruitment:applications.title')}
        description={t('recruitment:applications.subtitle')}
        actions={
          <Link
            to="/student/opportunities"
            className="inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-on-brand shadow-sm transition-colors hover:bg-brand-blue-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {t('student:nav.exploreInternships')}
          </Link>
        }
      />

      {candidaciesQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : candidaciesQuery.isError ? (
        <ErrorState
          description={t('recruitment:applications.error')}
          onRetry={() => void candidaciesQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : candidacies.length === 0 ? (
        <EmptyState
          title={t('recruitment:applications.empty')}
          description={t('recruitment:applications.emptyHint')}
          action={
            <Link
              to="/student/opportunities"
              className="inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-blue-strong motion-reduce:transition-none"
            >
              {t('student:nav.exploreInternships')}
            </Link>
          }
        />
      ) : (
        <>
          <Tabs
            label={t('recruitment:applications.filterLabel')}
            value={filter}
            onValueChange={(value) => setFilter(value as StatusFilter)}
            items={(['all', 'active', 'offers', 'closed'] as const).map((id) => ({
              id,
              label: `${t(`recruitment:applications.filters.${id}`)} (${counts[id]})`,
            }))}
          />

          {visible.length === 0 ? (
            <EmptyState title={t('recruitment:applications.emptyForFilter')} />
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((candidacy) => (
                <li key={candidacy.id}>
                  <Card interactive padding="lg" className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-foreground">
                          <Link
                            to={`/student/applications/${candidacy.id}`}
                            className="focus-visible:outline-none focus-visible:underline after:absolute after:inset-0"
                          >
                            {candidacy.opportunityTitle}
                          </Link>
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                          {t('recruitment:applications.appliedOn', { date: formatDate(candidacy.createdAt) })}
                          {' · '}
                          {t(`recruitment:sourceValues.${candidacy.source}`)}
                        </p>
                      </div>
                      <StatusBadge tone={CANDIDACY_STATUS_TONE[candidacy.status]}>
                        {t(`recruitment:candidacyStatusValues.${candidacy.status}`)}
                      </StatusBadge>
                    </div>

                    {candidacy.liveOffer?.status === 'PENDING' && (
                      <p className="mt-3 flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm font-medium text-warning">
                        <Icon name="alert" className="size-4 shrink-0" />
                        {t('recruitment:applications.offerAwaitingResponse', {
                          deadline: formatDate(candidacy.liveOffer.responseDeadline),
                        })}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  )
}
