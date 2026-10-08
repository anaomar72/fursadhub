import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { studentQueries } from '../../student/studentQueries'
import { PlacementList } from '../components/PlacementList'
import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * The student's own internships (CLAUDE.md section 39). A student normally has one live placement
 * at a time, but past ones stay listed — a completed or terminated internship is history worth
 * keeping, not a row to clear away.
 */
export function MyPlacementsPage() {
  const { t } = useTranslation()

  const placementsQuery = useQuery(studentQueries.placements())

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('placements:student.title')} description={t('placements:student.subtitle')} />

      {placementsQuery.isLoading ? (
        <SkeletonList rows={2} />
      ) : placementsQuery.isError ? (
        <ErrorState onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : (placementsQuery.data ?? []).length === 0 ? (
        <EmptyPlacements />
      ) : (
        <PlacementList
          placements={placementsQuery.data ?? []}
          audience="student"
          heading={t('placements:student.resultsHeading')}
          detailPath={(placement) => `/student/placements/${placement.id}`}
          emptyMessage={t('placements:student.empty')}
        />
      )}
    </PageContainer>
  )
}

function EmptyPlacements() {
  const { t } = useTranslation()
  return (
    <EmptyState
      title={t('placements:student.empty')}
      description={t('placements:student.emptyHint')}
      action={
        <Link
          to="/student/opportunities"
          className="inline-flex h-10 items-center rounded-md bg-action-primary px-4 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
        >
          {t('student:nav.exploreInternships')}
        </Link>
      }
    />
  )
}
