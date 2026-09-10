import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../api/placementsApi'
import { PlacementList } from '../components/PlacementList'
import { ErrorState, LoadingState, PageHeader } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * The student's own internships (CLAUDE.md section 39). A student normally has one live placement
 * at a time, but past ones stay listed — a completed or terminated internship is history worth
 * keeping, not a row to clear away.
 */
export function MyPlacementsPage() {
  const { t } = useTranslation()

  const placementsQuery = useQuery({
    queryKey: ['student', 'placements'],
    queryFn: placementsApi.listMyPlacements,
  })

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('placements:student.title')} description={t('placements:student.subtitle')} />

      {placementsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : placementsQuery.isError ? (
        <ErrorState onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : (placementsQuery.data ?? []).length === 0 ? (
        <EmptyPlacements />
      ) : (
        <PlacementList
          placements={placementsQuery.data ?? []}
          audience="student"
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
    <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <h2 className="font-display text-lg font-bold text-brand-navy dark:text-foreground">
        {t('placements:student.empty')}
      </h2>
      <Link
        to="/student/opportunities"
        className="mt-4 inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-blue-strong motion-reduce:transition-none"
      >
        {t('student:nav.exploreInternships')}
      </Link>
    </div>
  )
}
