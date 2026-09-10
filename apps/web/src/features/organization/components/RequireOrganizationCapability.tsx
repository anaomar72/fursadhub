import { Navigate, Outlet } from 'react-router-dom'
import { useOrganizationMembership } from './OrganizationMembershipContext'
import { organizationCapabilities, type OrganizationCapabilities } from '../organizationCapabilities'

/**
 * Route-level capability gate for the organization portal.
 *
 * <p>Reads the SAME {@link organizationCapabilities} flags the sidebar reads, so a destination that
 * the navigation hides is also unreachable by typing its URL. There is no permission logic here —
 * it takes the name of a flag and asks the one component that already owns the answer.
 *
 * <p><strong>This is UX, not security.</strong> The backend re-authorizes every request from current
 * PostgreSQL data (CLAUDE.md section 24), and it is what actually refuses a recruiter who forges a
 * request. What this fixes is the other half: a role could previously load a page whose every call
 * came back 403, which reads as a broken product rather than a boundary.
 *
 * <p>Placed as a pathless layout route INSIDE {@code OrganizationAreaLayout}, so membership is
 * already resolved when it runs. The guarded page therefore never mounts, never paints and never
 * fires its queries before the decision is made — no flash of protected content, and no avoidable
 * request.
 */
export function RequireOrganizationCapability({ capability }: { capability: keyof OrganizationCapabilities }) {
  const membership = useOrganizationMembership()
  const can = organizationCapabilities(membership)

  // The portal landing page: every organization member can use it, so this can never loop.
  return can[capability] ? <Outlet /> : <Navigate to="/organization/dashboard" replace />
}
