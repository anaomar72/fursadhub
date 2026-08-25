import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as placementsApi from '../api/placementsApi'
import { UniversityMembershipContext } from '../../university/components/UniversityMembershipContext'
import { OrganizationMembershipContext } from '../../organization/components/OrganizationMembershipContext'
import { PlacementSummary } from '../components/PlacementSummary'
import { PlacementLifecycleActions } from '../components/PlacementLifecycleActions'
import { SupervisorPanel } from '../components/SupervisorPanel'
import { SupervisorHistory } from '../components/SupervisorHistory'
import { LoadingSpinner } from '../../../components/ui'

interface PlacementDetailPageProps {
  /**
   * Which side of the placement this screen is being viewed from. It selects which controls are
   * OFFERED, never who is allowed to use them — the backend authorizes every call independently
   * (CLAUDE.md section 24), so rendering a control the caller may not use would fail server-side
   * rather than succeed.
   */
  area: 'organization' | 'university'
}

/**
 * Staff detail for one placement: its context, its lifecycle, and its supervisors.
 *
 * <p>The split of authority is deliberate and mirrors the backend. The hosting ORGANIZATION drives
 * the lifecycle and owns the organization supervisor, because it is the party that knows whether
 * the student actually started, stopped, or finished. The UNIVERSITY owns the university
 * supervisor. Neither side can act on the other's post.
 */
export function PlacementDetailPage({ area }: PlacementDetailPageProps) {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()

  // Read both memberships without throwing: only the one matching this area is ever populated,
  // and a hook cannot be called conditionally.
  const universityMembership = useContext(UniversityMembershipContext)
  const organizationMembership = useContext(OrganizationMembershipContext)

  const placementQuery = useQuery({
    queryKey: ['placements', 'detail', placementId],
    queryFn: () => placementsApi.getPlacement(placementId!),
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

  const isOrganization = area === 'organization'

  /*
   * A supervisor can READ a placement they are assigned to, but supervising it does not confer the
   * authority to end it or to replace themselves — the backend excludes UNIVERSITY_SUPERVISOR and
   * ORGANIZATION_SUPERVISOR from these commands. Mirroring that here keeps the page from offering
   * a form whose submit could only ever be refused.
   */
  const canManageOrganization =
    isOrganization &&
    (organizationMembership?.role === 'ORGANIZATION_ADMIN' ||
      organizationMembership?.role === 'RECRUITER')

  const canManageUniversity =
    !isOrganization &&
    (universityMembership?.role === 'UNIVERSITY_ADMIN' ||
      universityMembership?.role === 'DEPARTMENT_COORDINATOR')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PlacementSummary placement={placement} audience="staff" />

      {/* Only the hosting organization drives the lifecycle in Phase 5. */}
      {canManageOrganization && <PlacementLifecycleActions placement={placement} />}

      <SupervisorPanel placement={placement} type="UNIVERSITY" canAssign={canManageUniversity} />
      <SupervisorPanel placement={placement} type="ORGANIZATION" canAssign={canManageOrganization} />

      <SupervisorHistory placementId={placement.id} />
    </div>
  )
}
