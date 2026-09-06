import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'

export interface VerifiedBadgeProps {
  /**
   * `check` is the approved compact blue check that sits directly beside an entity name — the
   * treatment used on every organization, university and opportunity card in
   * design-reference/presentation-refresh-2026, replacing the previous large green badge.
   *
   * `label` is the blue pill with the word alongside it, for the places the references still spell
   * the status out (the universities directory cards, and any standalone status row).
   */
  variant?: 'check' | 'label'
  size?: 'sm' | 'md'
  className?: string
}

const CHECK_SIZE = { sm: 'size-4', md: 'size-[18px]' } as const

/**
 * The one "this institution is verified" signal used everywhere — opportunity cards, organization
 * and university profiles, portal headers. A single shared component so the trust mark reads the
 * same way platform-wide.
 *
 * <p>Verification status itself always comes from the backend; this only renders it.
 */
export function VerifiedBadge({ variant = 'check', size = 'md', className }: VerifiedBadgeProps) {
  const { t } = useTranslation()
  const label = t('common:status.verified')

  if (variant === 'label') {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-blue-soft px-2.5 py-1 text-xs font-semibold text-brand-blue',
          className,
        )}
      >
        <CheckMark className="size-3.5" />
        {label}
      </span>
    )
  }

  // Colour alone never carries the meaning: the mark is labelled for assistive technology and
  // titled for pointer users (BRAND_AND_UI_GUIDELINES.md section 9/17).
  return (
    <span className={cn('inline-flex shrink-0 items-center', className)} title={label}>
      <CheckMark className={cn(CHECK_SIZE[size], 'text-brand-blue')} />
      <span className="sr-only">{label}</span>
    </span>
  )
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path
        d="M4.75 8.25L6.9 10.4L11.25 6"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
