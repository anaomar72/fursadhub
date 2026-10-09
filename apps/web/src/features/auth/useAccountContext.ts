import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getMe } from './api/authApi'
import * as organizationApi from '../organization/api/organizationApi'
import * as universityApi from '../university/api/universityApi'
import { consolePathFor, resolveAccountWorkspace } from './roleRedirect'

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
 * lives in each area's own records. This uses {@link resolveAccountWorkspace}, the same probe sign-in
 * uses, then resolves the tenant's public name so the trigger can say "Recruiter · Acme Ltd"
 * instead of an email address.
 *
 * <p><strong>What it deliberately does not expose.</strong> No membership id, no tenant id, no
 * department id, and the email only as a fallback for a display name the account has not set. The
 * menu this feeds sits on the PUBLIC site, where a shoulder-surfer is a realistic threat and there
 * is no reason for an identifier to be on screen.
 *
 * <p>It is the same probe and the same path mapping ({@link consolePathFor}) as sign-in, so the
 * label and the destination can never disagree — including for an account with no workspace yet,
 * whose "workspace" link is the neutral get-started step rather than the student area.
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
      const workspace = await resolveAccountWorkspace()
      const consolePath = consolePathFor(workspace)

      if (workspace.kind === 'platform') {
        return { kind: workspace.kind, consolePath, role: workspace.adminSession.roles?.[0] ?? null }
      }
      if (workspace.kind === 'organization') {
        const organization = await organizationApi
          .getPublicOrganization(workspace.membership.organizationId)
          .catch(() => null)
        return { kind: workspace.kind, consolePath, role: workspace.membership.role, tenantName: organization?.name }
      }
      if (workspace.kind === 'university') {
        const university = await universityApi
          .getPublicUniversity(workspace.membership.universityId)
          .catch(() => null)
        return { kind: workspace.kind, consolePath, role: workspace.membership.role, tenantName: university?.name }
      }
      return { kind: workspace.kind, consolePath, role: null }
    },
  })

  if (!enabled || !me.data) return undefined

  const email = me.data.email ?? ''
  const resolved = context.data

  // Until resolved, the student area — every account may enter it, and it is what this link
  // pointed at before the workspace probe existed. Resolved, it is exactly sign-in's destination.
  const consolePath = resolved?.consolePath ?? '/student'

  return {
    // `/me` carries no display name today, so the local part of the address is what is printed —
    // the least revealing thing that is still recognisably the person, and never the full address.
    // If `/me` gains a real name later, this is the one line that changes.
    displayName: email.split('@')[0] || email,
    // An account with no workspace yet has no role to name — it is not a student either.
    roleLabel:
      !resolved || resolved.kind === 'none'
        ? undefined
        : resolved.role
          ? t(`common:roles.${resolved.role}`, { defaultValue: t('common:roles.STUDENT') })
          : t('common:roles.STUDENT'),
    tenantName: resolved && 'tenantName' in resolved ? (resolved.tenantName ?? undefined) : undefined,
    consolePath,
    hasAvatar: me.data.hasAvatar ?? false,
    userId: me.data.id,
  }
}
