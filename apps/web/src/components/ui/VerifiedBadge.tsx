import { useTranslation } from 'react-i18next'
import { StatusBadge } from './StatusBadge'

export interface VerifiedBadgeProps {
  className?: string
}

/**
 * The one "this institution is verified" badge used everywhere — opportunity cards, organization
 * and university public profiles (Phase 8). A single shared component so the trust signal reads
 * the same way platform-wide, rather than each feature inventing its own verified treatment
 * (BRAND_AND_UI_GUIDELINES.md section 16).
 */
export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  const { t } = useTranslation()
  return (
    <StatusBadge tone="success" className={className} icon={<CheckIcon />}>
      {t('common:status.verified')}
    </StatusBadge>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
