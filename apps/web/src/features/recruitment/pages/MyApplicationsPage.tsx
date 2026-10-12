import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CANDIDACY_STATUS_TONE } from '../../../lib/status/statusTones'
import { ACTIVE_CANDIDACY_STATUSES } from '../../student/studentReadiness'
import { studentQueries } from '../../student/studentQueries'
import type { CandidacyStatus, StudentCandidacyResponse } from '../types'
import {
  Badge,
  ButtonLink,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  SkeletonList,
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

  const candidaciesQuery = useQuery(studentQueries.candidacies())

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
            className="inline-flex h-10 items-center rounded-md bg-action-primary px-4 text-sm font-semibold text-on-action shadow-sm transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {t('student:nav.exploreInternships')}
          </Link>
        }
      />

      {candidaciesQuery.isLoading ? (
        <SkeletonList rows={4} />
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
              className="inline-flex h-10 items-center rounded-md bg-action-primary px-4 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover motion-reduce:transition-none"
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
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {visible.map((candidacy) => (
                <ApplicationRow key={candidacy.id} candidacy={candidacy} />
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  )
}

/**
 * One application: what it is, how it started, where it stands — and, in a sentence, what that
 * status means for the student. The sentence is a plain reading of the backend status (CLAUDE.md
 * section 37), never a promise about timing. A live offer gets its deadline and its one action.
 */
function ApplicationRow({ candidacy }: { candidacy: StudentCandidacyResponse }) {
  const { t } = useTranslation()
  const offer = candidacy.liveOffer?.status === 'PENDING' ? candidacy.liveOffer : null

  return (
    <li className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-body-lg font-semibold text-foreground">
            <Link
              to={`/student/applications/${candidacy.id}`}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {candidacy.opportunityTitle}
            </Link>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-foreground-secondary">
            <span>{t('recruitment:applications.appliedOn', { date: formatDate(candidacy.createdAt) })}</span>
            {candidacy.source !== 'SELF_APPLICATION' && <Badge>{t(`recruitment:sourceValues.${candidacy.source}`)}</Badge>}
          </p>
        </div>
        <StatusBadge tone={CANDIDACY_STATUS_TONE[candidacy.status]}>
          {t(`recruitment:candidacyStatusValues.${candidacy.status}`)}
        </StatusBadge>
      </div>

      {offer ? (
        <div className="flex flex-col gap-3 rounded-lg bg-warning-bg p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-body font-medium text-foreground">
            <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-warning" />
            {t('recruitment:applications.offerAwaitingResponse', { deadline: formatDate(offer.responseDeadline) })}
          </p>
          <ButtonLink to={`/student/applications/${candidacy.id}`} size="sm" className="w-full sm:w-auto sm:shrink-0">
            {t('recruitment:applications.reviewOffer')}
          </ButtonLink>
        </div>
      ) : (
        <p className="text-body text-foreground-secondary">
          {t(`recruitment:applications.statusGuidance.${candidacy.status}`)}
          {candidacy.status === 'ACCEPTED' && (
            <>
              {' '}
              <Link
                to="/student/placements"
                className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {t('recruitment:applications.viewInternship')}
              </Link>
            </>
          )}
        </p>
      )}
    </li>
  )
}
