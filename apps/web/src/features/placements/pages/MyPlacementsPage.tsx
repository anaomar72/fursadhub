import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as placementsApi from '../api/placementsApi'
import { PlacementList } from '../components/PlacementList'
import { LoadingSpinner, PageHeader } from '../../../components/ui'

/**
 * The student's own internships (CLAUDE.md section 39). A student normally has one live placement
 * at a time, but past ones stay listed — a completed or terminated internship is history worth
 * keeping, not a row to clear away.
 */
export function MyPlacementsPage() {
  const { t } = useTranslation()

  const placementsQuery = useQuery({
    queryKey: ['placements', 'mine'],
    queryFn: placementsApi.listMyPlacements,
  })

  if (placementsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('placements:student.title')} />

      <PlacementList
        placements={placementsQuery.data ?? []}
        audience="student"
        detailPath={(placement) => `/student/placements/${placement.id}`}
        emptyMessage={t('placements:student.empty')}
      />
    </div>
  )
}
