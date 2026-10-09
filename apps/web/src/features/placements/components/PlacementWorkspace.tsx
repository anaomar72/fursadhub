import { RouteSuspense } from '../../../app/router/RouteFallback'
import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams } from 'react-router-dom'
import { Breadcrumbs, EmptyState, Skeleton, SkeletonList, SkeletonRegion } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import * as placementsApi from '../api/placementsApi'
import { InternshipNav, type InternshipArea } from './InternshipNav'
import { PlacementSummary } from './PlacementSummary'
import { OrganizationMembershipContext } from '../../organization/components/OrganizationMembershipContext'
import { organizationCapabilities } from '../../organization/organizationCapabilities'

/** What each area calls its placement list — the same label as its sidebar entry. */
const LIST_LABEL: Record<InternshipArea, string> = {
  student: 'placements:nav.myPlacements',
  university: 'placements:nav.placements',
  organization: 'organization:nav.interns',
}

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
  // A supervisor's sidebar entry reads "My interns"; the way back uses the same words.
  const organizationMembership = useContext(OrganizationMembershipContext)
  const listLabel =
    area === 'organization' && organizationMembership && organizationCapabilities(organizationMembership).scopedToAssignedPlacements
      ? 'organization:nav.myInterns'
      : LIST_LABEL[area]

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
        <SkeletonRegion className="flex flex-col gap-6">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-10 w-full" />
          <SkeletonList rows={3} />
        </SkeletonRegion>
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
      {/* Phase 9: placement → module is a nested hierarchy, so every placement page carries the way back. */}
      <Breadcrumbs
        items={[
          { label: t(listLabel), to: `/${area}/placements` },
          {
            label:
              area === 'student'
                ? (placement.opportunityTitle ?? t('placements:detail.untitledOpportunity'))
                : (placement.studentFullName ?? placement.studentEmail ?? t('placements:detail.unknownStudent')),
          },
        ]}
      />
      <PlacementSummary placement={placement} audience={area === 'student' ? 'student' : 'staff'} />
      <InternshipNav area={area} basePath={basePath} />
      <RouteSuspense><Outlet context={placement} /></RouteSuspense>
    </PageContainer>
  )
}
