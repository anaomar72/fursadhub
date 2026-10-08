import type { IconName } from '../../components/ui'

export type SelfServiceAccountType = 'student' | 'organization' | 'university'

/**
 * The three SELF-service account types, shared by registration and the signed-in get-started step
 * so there is exactly one definition of what can be chosen. Staff (coordinators, supervisors,
 * recruiters) are never offered: tenant administrators create those accounts (CLAUDE.md section
 * 26A). The choice is presentation and routing only — it is not persisted and grants nothing.
 */
export const ACCOUNT_TYPE_OPTIONS: readonly { type: SelfServiceAccountType; icon: IconName }[] = [
  { type: 'student', icon: 'graduationCap' },
  { type: 'organization', icon: 'building' },
  { type: 'university', icon: 'bank' },
]

/** Where each type's own, already-existing setup step lives. */
export const ACCOUNT_TYPE_SETUP_PATH: Record<SelfServiceAccountType, string> = {
  student: '/student/enrollment',
  organization: '/organization',
  university: '/university',
}
