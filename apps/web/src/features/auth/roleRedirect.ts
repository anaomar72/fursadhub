import * as adminApi from '../admin/api/adminApi'
import * as organizationApi from '../organization/api/organizationApi'
import * as universityApi from '../university/api/universityApi'

/**
 * Where a visitor lands right after their first sign-in, when they arrived through a role-specific
 * door on the landing page (CLAUDE.md section 2 — student/organization/university are the three
 * self-registering tenant types). Each area's layout already shows its own inline setup step
 * (EnrollmentPage, OrganizationSetupPage, UniversitySetupPage) the first time a caller has no
 * membership yet, so landing there directly — instead of the generic `/` — skips a step nobody
 * would otherwise know to take.
 */
const ROLE_LANDING_PATH: Record<string, string> = {
  student: '/student',
  organization: '/organization',
  university: '/university',
}

export function roleLandingPath(role: string | null): string | null {
  return role ? (ROLE_LANDING_PATH[role] ?? null) : null
}

/**
 * Where a returning visitor's console actually is, for the common case of signing in from the
 * plain top-nav "Sign in" link — no `role` query param, no `from` location to bounce back to. That
 * link is the everyday sign-in path, so falling back to `/` there (the marketing landing page)
 * sent every returning user back to the door they came in through instead of their console.
 *
 * <p>Roles are contextual (CLAUDE.md section 23), so the account itself carries no fixed role to
 * read off `/me` — the real answer lives in each area's own membership record. This probes them
 * the same way {@code AdminSession} already documents as safe ("200 with an empty role list for an
 * ordinary user"): every call here is a plain membership lookup, never a mutation, and a caller
 * with no membership anywhere still gets a valid destination rather than an error.
 *
 * <p>Checked in this order because they are mutually exclusive in practice (nobody holds staff
 * membership at both an organization and a university) except for the student area, which every
 * account can enter — {@link StudentAreaLayout} performs no membership check at all — so it is the
 * fallback rather than one more race.
 */
export async function resolveConsolePath(): Promise<string> {
  const [adminSession, organizationMemberships, universityMembership] = await Promise.all([
    adminApi.getAdminSession().catch(() => null),
    organizationApi.getMyMemberships().catch(() => []),
    universityApi.getMyMembership().catch(() => null),
  ])

  if (adminSession?.platformAdmin) return '/admin'
  if (organizationMemberships.length > 0) return '/organization'
  if (universityMembership) return '/university'
  return '/student'
}
