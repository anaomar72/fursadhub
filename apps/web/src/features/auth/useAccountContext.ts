import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getMe } from './api/authApi'
import * as adminApi from '../admin/api/adminApi'
import * as organizationApi from '../organization/api/organizationApi'
import * as universityApi from '../university/api/universityApi'

export interface AccountContext {
  /** The name to print. Falls back to the local part of the email — never the whole address. */
  displayName: string
  /** Translated role, e.g. "Recruiter". Absent while unresolved, or for an account with no staff role. */
  roleLabel?: string
  /** The institution the role is held at. Absent for students and platform staff. */
  tenantName?: string
  /** Where this account's workspace lives. */
  consolePath: string
  hasAvatar: boolean
  userId?: string
}

/**
 * Who the signed-in visitor is, in the words the product uses about them.
 *
 * <p>Roles are contextual (CLAUDE.md section 23), so `/me` carries no role to read — the answer
 * lives in each area's own membership record. This probes the same three lookups
 * {@link resolveConsolePath} already documents as safe, then resolves the tenant's public name so
 * the trigger can say "Recruiter · Acme Ltd" instead of an email address.
 *
 * <p><strong>What it deliberately does not expose.</strong> No membership id, no tenant id, no
 * department id, and the email only as a fallback for a display name the account has not set. The
 * menu this feeds sits on the PUBLIC site, where a shoulder-surfer is a realistic threat and there
 * is no reason for an identifier to be on screen.
 *
 * <p>Precedence matches `resolveConsolePath` exactly, so the label and the destination can never
 * disagree: platform, then organization, then university, then student as the fallback every
 * account can enter.
 */
export function useAccountContext(enabled: boolean): AccountContext | undefined {
  const { t } = useTranslation()

  const me = useQuery({ queryKey: ['me'], queryFn: getMe, enabled, staleTime: 60_000, retry: false })

  const context = useQuery({
    queryKey: ['account-context'],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const [adminSession, organizationMemberships, universityMembership] = await Promise.all([
        adminApi.getAdminSession().catch(() => null),
        organizationApi.getMyMemberships().catch(() => []),
        universityApi.getMyMembership().catch(() => null),
      ])

      if (adminSession?.platformAdmin) {
        return { kind: 'platform' as const, role: adminSession.roles?.[0] ?? null }
      }
      const organizationMembership = organizationMemberships[0]
      if (organizationMembership) {
        const organization = await organizationApi
          .getPublicOrganization(organizationMembership.organizationId)
          .catch(() => null)
        return { kind: 'organization' as const, role: organizationMembership.role, tenantName: organization?.name }
      }
      if (universityMembership) {
        const university = await universityApi
          .getPublicUniversity(universityMembership.universityId)
          .catch(() => null)
        return { kind: 'university' as const, role: universityMembership.role, tenantName: university?.name }
      }
      return { kind: 'student' as const, role: null }
    },
  })

  if (!enabled || !me.data) return undefined

  const email = me.data.email ?? ''
  const resolved = context.data

  const consolePath =
    resolved?.kind === 'platform'
      ? '/admin'
      : resolved?.kind === 'organization'
        ? '/organization'
        : resolved?.kind === 'university'
          ? '/university'
          : '/student'

  return {
    // `/me` carries no display name today, so the local part of the address is what is printed —
    // the least revealing thing that is still recognisably the person, and never the full address.
    // If `/me` gains a real name later, this is the one line that changes.
    displayName: email.split('@')[0] || email,
    roleLabel: resolved
      ? resolved.role
        ? t(`common:roles.${resolved.role}`, { defaultValue: t('common:roles.STUDENT') })
        : t('common:roles.STUDENT')
      : undefined,
    tenantName: resolved && 'tenantName' in resolved ? (resolved.tenantName ?? undefined) : undefined,
    consolePath,
    hasAvatar: me.data.hasAvatar ?? false,
    userId: me.data.id,
  }
}
