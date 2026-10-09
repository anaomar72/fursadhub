import * as adminApi from '../admin/api/adminApi'
import * as organizationApi from '../organization/api/organizationApi'
import * as studentApi from '../student/api/studentApi'
import * as universityApi from '../university/api/universityApi'
import { ApiError } from '../../lib/api/client'
import type { AdminSession } from '../admin/types'
import type { MyOrganizationMembershipResponse } from '../organization/types'
import type { MyMembershipResponse } from '../university/types'

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

/** The neutral first step for a signed-in account that has not set anything up yet. */
export const GET_STARTED_PATH = '/get-started'

export type AccountWorkspace =
  | { kind: 'platform'; adminSession: AdminSession }
  | { kind: 'organization'; membership: MyOrganizationMembershipResponse }
  | { kind: 'university'; membership: MyMembershipResponse }
  | { kind: 'student' }
  | { kind: 'none' }

/**
 * Which workspace a signed-in account actually has, from durable server data only.
 *
 * <p>Roles are contextual (CLAUDE.md section 23), so the account itself carries no fixed role to
 * read off `/me`, and registration stores only an email and a password — the account type chosen
 * on the register screen is NOT persisted. The answer therefore comes from each area's own record:
 * platform roles, then organization membership, then university membership (mutually exclusive in
 * practice), then an established student identity — a claimed enrollment or a saved student
 * profile.
 *
 * <p>An account with none of those is `none`, not `student`. Defaulting to the student area sent a
 * new organization or university founder who signed in before creating their institution into the
 * student portal. Every call here is a plain read, never a mutation.
 *
 * <p>Only a 404 ("none claimed yet") counts as absence for the student records. Any other failure
 * keeps the previous student default, so a network hiccup can never push an established student
 * into onboarding — this is navigation, never authorization (CLAUDE.md section 24).
 */
export async function resolveAccountWorkspace(): Promise<AccountWorkspace> {
  const [adminSession, organizationMemberships, universityMembership] = await Promise.all([
    adminApi.getAdminSession().catch(() => null),
    organizationApi.getMyMemberships().catch(() => [] as MyOrganizationMembershipResponse[]),
    universityApi.getMyMembership().catch(() => null),
  ])

  if (adminSession?.platformAdmin) return { kind: 'platform', adminSession }
  if (organizationMemberships[0]) return { kind: 'organization', membership: organizationMemberships[0] }
  if (universityMembership) return { kind: 'university', membership: universityMembership }

  const exists = (request: Promise<unknown>) =>
    request.then(
      () => true,
      (error: unknown) => !(error instanceof ApiError && error.body.status === 404),
    )
  const [hasEnrollment, hasProfile] = await Promise.all([
    exists(studentApi.getMyEnrollment()),
    exists(studentApi.getMyProfile()),
  ])
  return hasEnrollment || hasProfile ? { kind: 'student' } : { kind: 'none' }
}

/** The console path for a resolved workspace — one mapping, shared by sign-in and the account menu. */
export function consolePathFor(workspace: AccountWorkspace): string {
  switch (workspace.kind) {
    case 'platform':
      return '/admin'
    case 'organization':
      return '/organization'
    case 'university':
      return '/university'
    case 'student':
      return '/student'
    case 'none':
      return GET_STARTED_PATH
  }
}

/**
 * Where a returning visitor's console actually is, for the common case of signing in from the
 * plain top-nav "Sign in" link — no `role` query param, no `from` location to bounce back to.
 */
export async function resolveConsolePath(): Promise<string> {
  return consolePathFor(await resolveAccountWorkspace())
}
