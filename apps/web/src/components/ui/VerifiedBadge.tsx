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
  variant?: 'check' | 'label' | 'information'
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
  if (variant === 'information') return <span title={label} className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue', className)}>
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 4.5 6v5.5c0 4.2 3.2 7.4 7.5 9.5 4.3-2.1 7.5-5.3 7.5-9.5V6L12 3Z"/><path d="m8 11.5 2.7 2.7 5.3-5.3"/></svg><span className="sr-only">{label}</span>
  </span>

  if (variant === 'label') {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded bg-brand-blue-soft px-1.5 py-0.5 text-caption font-medium text-brand-blue',
          className,
        )}
      >
        <CheckMark className="size-3.5" />
        {label}
      </span>
    )
  }

  // Colour alone never carries the meaning: the mark is labelled for assistive technology and
  // titled for pointer users (WCAG 1.4.1).
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
      <path d="m8 0 2 1.4 2.5.1.8 2.4L15.4 5l-.3 2.6.9 2.3-1.8 1.9-.5 2.5-2.6.4L8 16l-2.1-1.3-2.6-.4-.5-2.5L1 10l.6-2.4L.6 5l2.1-1.1.8-2.4 2.5-.1L8 0Z" fill="currentColor" />
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
