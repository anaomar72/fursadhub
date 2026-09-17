import { RouteSuspense } from '../../../app/router/RouteFallback'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
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

  // Loading and not-found sit in the SAME container as the loaded page, so the content does not
  // jump position once the placement arrives.
  if (placementQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const placement = placementQuery.data
  if (!placement) {
    return (
      <PageContainer>
        <EmptyState title={t('placements:detail.notFound')} />
      </PageContainer>
    )
  }

  const basePath = `/${area}/placements/${placement.id}`

  return (
    /*
      `PageContainer`, not a hand-rolled column. This workspace used
      `mx-auto max-w-3xl px-4 py-8` while every other page in all three portals goes through
      PageContainer at `wide`, so moving between "My applications" and "My internship" visibly
      narrowed the page and shifted the content inward by about 160px — the clearest way for a
      sub-page to stop looking like it belongs to its portal. The overview already lays out two
      columns, so `wide` is the right width for it as well as the consistent one.
    */
    <PageContainer className="flex flex-col gap-6">
      <PlacementSummary placement={placement} audience={area === 'student' ? 'student' : 'staff'} />
      <InternshipNav area={area} basePath={basePath} />
      <RouteSuspense><Outlet context={placement} /></RouteSuspense>
    </PageContainer>
  )
}
