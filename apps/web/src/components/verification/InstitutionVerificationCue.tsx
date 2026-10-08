import { useTranslation } from 'react-i18next'
import { ButtonLink, Icon, StatusBadge } from '../ui'
import { cn } from '../../lib/utils/cn'
import { INSTITUTION_VERIFICATION_TONE, type InstitutionVerificationState } from '../../lib/status/statusTones'

export interface InstitutionVerificationCueProps {
  namespace: 'organization' | 'university'
  status: InstitutionVerificationState | undefined
  /** Where verification is completed — the institution's own profile. */
  to: string
  className?: string
}

const GUIDANCE_KEY = {
  organization: (status: InstitutionVerificationState) => `organization:verificationGate.statusGuidance.${status}`,
  university: (status: InstitutionVerificationState) => `university:profile.statusGuidance.${status}`,
} as const

const LINK_KEY = {
  organization: 'organization:verificationGate.goToProfile',
  university: 'university:profile.goToVerification',
} as const

/**
 * A first-use cue on an institution admin's dashboard: until the institution is verified, say so,
 * say what it means right now, and link to the one place it can be completed.
 *
 * <p>A newly created organization or university used to land on a dashboard of zeros with no
 * mention of verification — the step that unlocks publishing (organizations) or being targeted by
 * internships (universities). This is deliberately light: one row, the exact backend status, the
 * same guidance the profile shows, no review-time promise. It renders nothing once verified, and
 * nothing while the status is unknown (it never guesses).
 */
export function InstitutionVerificationCue({ namespace, status, to, className }: InstitutionVerificationCueProps) {
  const { t } = useTranslation()
  if (!status || status === 'VERIFIED') return null
  const stopped = status === 'REJECTED' || status === 'SUSPENDED' || status === 'REVOKED'
  return (
    <section
      aria-labelledby="verification-cue-title"
      className={cn(
        'flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
        stopped ? 'border-danger/25 bg-danger-bg' : 'border-warning/25 bg-warning-bg',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon name={stopped ? 'alert' : 'shield'} className={cn('mt-0.5 size-5 shrink-0', stopped ? 'text-danger' : 'text-warning')} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="verification-cue-title" className="text-label text-foreground">
              {t(`${namespace}:profile.verificationTitle`)}
            </h2>
            <StatusBadge tone={INSTITUTION_VERIFICATION_TONE[status]}>{t(`${namespace}:profile.verificationStatusValues.${status}`)}</StatusBadge>
          </div>
          <p className="mt-1 text-body text-foreground-secondary">{t(GUIDANCE_KEY[namespace](status))}</p>
        </div>
      </div>
      <ButtonLink to={to} variant="outline" className="shrink-0">
        {t(LINK_KEY[namespace])}
      </ButtonLink>
    </section>
  )
}
