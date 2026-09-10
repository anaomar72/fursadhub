import { useTranslation } from 'react-i18next'
import { Icon } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'
import { useToggleSavedOpportunity } from '../hooks/useSavedOpportunities'

export interface BookmarkButtonProps {
  opportunityId: string
  saved: boolean
  /** Hidden entirely when the viewer has no saved-internships capability (not a student). */
  available?: boolean
  disabled?: boolean
  /** `card` is the small control that sits in a listing card's corner; `inline` sits in a toolbar. */
  variant?: 'card' | 'inline'
  className?: string
}

/**
 * Save / unsave an internship (Backend Phase B4) — one control in two states, as in the approved
 * student reference where a saved card's bookmark is simply filled in.
 *
 * <p>The label is the ACTION, not the state ("Save internship" / "Remove from saved"), because that
 * is what a screen-reader user is choosing to do; the current state is carried by `aria-pressed`
 * so a toggle is announced as a toggle rather than as two different buttons.
 *
 * <p>`stopPropagation` matters on a card: the whole card is a link to the internship, and clicking
 * the bookmark must not navigate away from the page the student is scanning.
 */
export function BookmarkButton({
  opportunityId,
  saved,
  available = true,
  disabled = false,
  variant = 'card',
  className,
}: BookmarkButtonProps) {
  const { t } = useTranslation()
  const toggle = useToggleSavedOpportunity()

  if (!available) return null

  const label = saved ? t('student:saved.unsave') : t('student:saved.save')

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={label}
      disabled={disabled || toggle.isPending}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle.mutate({ opportunityId, saved })
      }}
      className={cn(
        // Above the card's stretched link, or the bookmark would be unclickable.
        'relative z-10 inline-flex shrink-0 items-center justify-center rounded-lg',
        'transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'card' ? 'size-8' : 'h-10 gap-2 px-3 text-sm font-semibold',
        saved
          ? 'text-brand-accent-ink hover:bg-brand-accent-soft'
          : 'text-muted hover:bg-surface-muted hover:text-foreground',
        variant === 'inline' && 'border border-border',
        className,
      )}
    >
      <Icon name={saved ? 'bookmarkFilled' : 'bookmark'} className={variant === 'card' ? 'size-5' : 'size-4'} />
      {variant === 'inline' && <span>{label}</span>}
    </button>
  )
}
