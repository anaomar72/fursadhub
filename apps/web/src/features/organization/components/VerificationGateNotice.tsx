import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert } from '../../../components/ui'
import { canSubmitForVerification } from '../organizationVerificationGating'
import type { InstitutionVerificationStatus } from '../types'

export interface VerificationGateNoticeProps {
  status: InstitutionVerificationStatus
  /** True for an ORGANIZATION_ADMIN, who can actually act on the advice. */
  canEditProfile: boolean
  className?: string
}

/**
 * Explains why publishing and resuming are unavailable while the organization is not verified
 * (Backend Phase B1.5 / `OrganizationVerificationGuard`).
 *
 * <p>Two rules govern the copy, both from Phase D section 25:
 *
 * <ul>
 *   <li>The status shown is the EXACT backend status — DRAFT, SUBMITTED, UNDER_REVIEW,
 *       NEEDS_CHANGES, REJECTED, SUSPENDED, REVOKED. No invented progress percentage, no
 *       "usually takes 24 hours", no "approved soon": FursadHub has no review-duration data and
 *       would be inventing a promise.</li>
 *   <li>The call to action is offered only where one genuinely exists. Submitting for review is
 *       possible from DRAFT and NEEDS_CHANGES; from SUBMITTED or UNDER_REVIEW the honest answer is
 *       that the review is with FursadHub, and from REJECTED/SUSPENDED/REVOKED it is that the
 *       organization must be in touch — not a button that would be refused.</li>
 * </ul>
 *
 * <p>Renders nothing when the organization is verified.
 */
export function VerificationGateNotice({ status, canEditProfile, className }: VerificationGateNoticeProps) {
  const { t } = useTranslation()

  if (status === 'VERIFIED') return null

  const actionable = canSubmitForVerification(status)

  return (
    <Alert
      tone={status === 'REJECTED' || status === 'SUSPENDED' || status === 'REVOKED' ? 'danger' : 'warning'}
      title={t('organization:verificationGate.title')}
      className={className}
    >
      <p className="mt-1">
        {t('organization:verificationGate.body', {
          status: t(`organization:profile.verificationStatusValues.${status}`),
        })}
      </p>
      <p className="mt-1">{t(`organization:verificationGate.statusGuidance.${status}`)}</p>
      {actionable && canEditProfile && (
        <Link
          to="/organization/profile"
          className="mt-2 inline-block text-sm font-semibold text-link underline-offset-2 hover:underline"
        >
          {t('organization:verificationGate.goToProfile')}
        </Link>
      )}
    </Alert>
  )
}
