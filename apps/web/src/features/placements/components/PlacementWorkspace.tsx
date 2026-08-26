import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../../../components/ui'
import * as placementsApi from '../api/placementsApi'
import { InternshipNav, type InternshipArea } from './InternshipNav'
import { PlacementSummary } from './PlacementSummary'

interface PlacementWorkspaceProps {
  area: InternshipArea
}

/**
 * The shell around one placement's internship-management sections.
 *
 * <p>The summary header and the section navigation stay put while the sections change, so a student
 * moving between their logs, attendance and report never loses sight of which internship they are
 * looking at.
 *
 * <p>The student route reads through {@code /students/me/placements/...}, which accepts no student
 * id at all (CLAUDE.md section 12); staff routes read the shared placement endpoint, which resolves
 * the caller's actual relationship to the placement.
 */
export function PlacementWorkspace({ area }: PlacementWorkspaceProps) {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()

  const placementQuery = useQuery({
    queryKey: area === 'student' ? ['placements', 'mine', placementId] : ['placements', placementId],
    queryFn: () =>
      area === 'student'
        ? placementsApi.getMyPlacement(placementId!)
        : placementsApi.getPlacement(placementId!),
    enabled: !!placementId,
  })

  if (placementQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const placement = placementQuery.data
  if (!placement) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('placements:detail.notFound')}
      </p>
    )
  }

  const basePath = `/${area}/placements/${placement.id}`

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PlacementSummary placement={placement} audience={area === 'student' ? 'student' : 'staff'} />
      <InternshipNav area={area} basePath={basePath} />
      <Outlet context={placement} />
    </div>
  )
}
