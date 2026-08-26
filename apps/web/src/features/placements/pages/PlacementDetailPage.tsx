import { useContext } from 'react'
import { useOutletContext } from 'react-router-dom'
import { UniversityMembershipContext } from '../../university/components/UniversityMembershipContext'
import { OrganizationMembershipContext } from '../../organization/components/OrganizationMembershipContext'
import { PlacementLifecycleActions } from '../components/PlacementLifecycleActions'
import { SupervisorPanel } from '../components/SupervisorPanel'
import { SupervisorHistory } from '../components/SupervisorHistory'
import { CompletionPanel } from '../components/CompletionPanel'
import type { PlacementResponse } from '../types'

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
 * The staff overview for one placement: its lifecycle, its supervisors, and its completion status.
 *
 * <p>The placement itself and the section navigation come from {@code PlacementWorkspace}; this is
 * the overview tab's body.
 *
 * <p>The split of authority is deliberate and mirrors the backend. The hosting ORGANIZATION drives
 * the Phase 5 lifecycle and owns the organization supervisor, because it is the party that knows
 * whether the student actually started, stopped, or finished. The UNIVERSITY owns the university
 * supervisor and — new in Phase 6 — the completion decision, because completion certifies that the
 * university's own requirements are met. Neither side can act on the other's post.
 */
export function PlacementDetailPage({ area }: PlacementDetailPageProps) {
  const placement = useOutletContext<PlacementResponse>()

  // Read both memberships without throwing: only the one matching this area is ever populated,
  // and a hook cannot be called conditionally.
  const universityMembership = useContext(UniversityMembershipContext)
  const organizationMembership = useContext(OrganizationMembershipContext)

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
    <div className="flex flex-col gap-6">
      {/* Only the hosting organization drives the lifecycle in Phase 5. */}
      {canManageOrganization && <PlacementLifecycleActions placement={placement} />}

      {/*
        Both areas see the checklist — the organization needs to know what is outstanding — but only
        university staff with standing authority are offered the completion action itself.
      */}
      <CompletionPanel placement={placement} canComplete={canManageUniversity} />

      <SupervisorPanel placement={placement} type="UNIVERSITY" canAssign={canManageUniversity} />
      <SupervisorPanel placement={placement} type="ORGANIZATION" canAssign={canManageOrganization} />

      <SupervisorHistory placementId={placement.id} />
    </div>
  )
}
