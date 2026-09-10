import { Navigate, Outlet } from 'react-router-dom'
import { useUniversityMembership } from './UniversityMembershipContext'
import { universityCapabilities, type UniversityCapabilities } from '../universityCapabilities'

/**
 * Route-level capability gate for the university portal — the counterpart to
 * {@code RequireOrganizationCapability}, reading the same {@link universityCapabilities} flags the
 * sidebar reads so a hidden destination is also unreachable by URL.
 *
 * <p><strong>UX, not security.</strong> The backend re-authorizes every request from current
 * PostgreSQL data (CLAUDE.md section 24) and is what actually refuses a coordinator reaching for an
 * admin API — live QA confirmed 403 on staff management, university profile writes and the student
 * directory. This stops the portal offering those pages in the first place, instead of rendering a
 * screen whose every call fails.
 *
 * <p>Runs inside {@code UniversityAreaLayout}, where the membership is already resolved, so the
 * guarded page never mounts and never fires its queries before the decision is made.
 */
export function RequireUniversityCapability({
  capability,
  invert = false,
}: {
  capability: keyof UniversityCapabilities
  /**
   * Require the flag to be FALSE instead of true. Needed because two destinations are defined that
   * way in the navigation — "partners" is for roles whose placement list is NOT narrowed to their
   * own assignments, and "my-students" is the mirror for the role whose list IS. Expressing it here
   * keeps the guard reading the same flag the sidebar reads, rather than inventing a second one.
   */
  invert?: boolean
}) {
  const membership = useUniversityMembership()
  const can = universityCapabilities(membership)
  const granted = invert ? !can[capability] : can[capability]

  // The portal landing page: every university member can use it, so this can never loop.
  return granted ? <Outlet /> : <Navigate to="/university/dashboard" replace />
}
