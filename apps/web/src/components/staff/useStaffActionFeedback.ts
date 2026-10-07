import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiErrorMessage } from '../../lib/api/errorMessage'
import { staffName } from './staffCommands'

/** The lifecycle commands a tenant admin runs from a staff row. */
export type StaffLifecycleCommand = 'suspend' | 'reactivate' | 'resetPassword' | 'revoke'

export interface StaffActionFeedback {
  tone: 'success' | 'danger'
  title: string
  /** For a failure: why, from the stable error code — never the raw server message. */
  detail?: string
}

type NamedMember = Parameters<typeof staffName>[0]

/**
 * The outcome of a staff lifecycle command, said out loud. These commands used to report nothing:
 * a refused suspension looked exactly like one that was never clicked. Success names the person
 * and what changed; failure names what failed and the reason the API gave (CLAUDE.md section 11).
 *
 * <p>A successful password reset reports nothing here — the one-time credential panel IS its
 * confirmation.
 */
export function useStaffActionFeedback(namespace: 'organization' | 'university') {
  const { t } = useTranslation()
  const [feedback, setFeedback] = useState<StaffActionFeedback | null>(null)

  const clear = useCallback(() => setFeedback(null), [])

  const succeeded = useCallback(
    (command: Exclude<StaffLifecycleCommand, 'resetPassword'>, member: NamedMember) =>
      setFeedback({ tone: 'success', title: t(`${namespace}:staff.feedback.${command}Done`, { name: staffName(member) }) }),
    [namespace, t],
  )

  const failed = useCallback(
    (command: StaffLifecycleCommand, member: NamedMember, error: unknown) =>
      setFeedback({
        tone: 'danger',
        title: t(`${namespace}:staff.feedback.${command}Failed`, { name: staffName(member) }),
        detail: apiErrorMessage(t, namespace, 'staff', error),
      }),
    [namespace, t],
  )

  return { feedback, clear, succeeded, failed }
}
