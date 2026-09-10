import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'

/**
 * The FursadHub star, drawn here rather than added to `Icon`, because it is the only place in the
 * product that needs one and it comes in two states (filled / hollow) that the icon set does not
 * model. It is decorative in both components below — the rating is always carried by real text or
 * by radio semantics, never by the shape alone (CLAUDE.md section 58, and colour is never the only
 * signal).
 */
function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('shrink-0', className)}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinejoin="round"
    >
      <path d="m12 2.6 2.9 5.88 6.5.95-4.7 4.58 1.1 6.47L12 17.43l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.6Z" />
    </svg>
  )
}

const SIZES = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' } as const

export interface StarRatingProps {
  /** 1-5. Pass null/undefined for a testimonial written before ratings existed — nothing renders. */
  value: number | null | undefined
  size?: keyof typeof SIZES
  className?: string
}

/**
 * A published rating, read-only.
 *
 * <p>Renders NOTHING when the value is absent. Testimonials submitted before rating support have no
 * score, and showing five hollow stars — or five filled ones — would put a number in a real person's
 * mouth that they never gave. The card simply omits the row instead.
 *
 * <p>The stars are `aria-hidden`; the accessible name is the sentence beside them, so a screen
 * reader hears "4 out of 5" rather than five list items.
 */
export function StarRating({ value, size = 'md', className }: StarRatingProps) {
  const { t } = useTranslation()
  if (value == null) return null

  const rounded = Math.max(1, Math.min(5, Math.round(value)))
  return (
    <p className={cn('flex items-center gap-1.5', className)}>
      <span className="flex items-center gap-0.5 text-brand-accent">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} filled={star <= rounded} className={SIZES[size]} />
        ))}
      </span>
      <span className="sr-only">{t('testimonials:rating.outOfFive', { rating: rounded })}</span>
    </p>
  )
}

export interface StarRatingInputProps {
  value: number | null
  onChange: (rating: number) => void
  /** The group's accessible name — "Rate your FursadHub experience". */
  label: string
  name?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

/**
 * The rating control on the submission form.
 *
 * <p>Built on a real radio group rather than on clickable spans. That is what makes it keyboard
 * operable without writing a single key handler: arrow keys move between the five options and
 * select as they go, Tab enters and leaves the group as one stop, and a screen reader announces
 * "Rate your FursadHub experience, 4 out of 5, radio button, 4 of 5". Decorative stars wired to
 * `onClick` would look identical and be unusable without a mouse (CLAUDE.md section 43).
 *
 * <p>Each label is the touch target and is sized well past the 44px comfortable minimum, and the
 * chosen value is also stated in words beneath, so the selection never depends on noticing a
 * colour change.
 */
export function StarRatingInput({
  value,
  onChange,
  label,
  name = 'rating',
  disabled,
  invalid,
  describedBy,
}: StarRatingInputProps) {
  const { t } = useTranslation()
  const groupId = useId()

  return (
    <fieldset disabled={disabled} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className="text-sm font-medium text-foreground">{label}</legend>

      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const id = `${groupId}-${star}`
          const active = value != null && star <= value
          return (
            <label
              key={star}
              htmlFor={id}
              className={cn(
                'flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors',
                'hover:bg-control-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-focus-ring',
                active ? 'text-brand-accent' : 'text-border-strong',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="sr-only"
              />
              {/* The per-option accessible name. The star itself stays decorative. */}
              <span className="sr-only">{t('testimonials:rating.outOfFive', { rating: star })}</span>
              <Star filled={active} className="size-7" />
            </label>
          )
        })}
      </div>

      {/*
        The selection in words. `aria-live` so a change is announced to a screen reader that is not
        tracking focus, and it holds a line whether or not anything is chosen, so picking a rating
        does not shift the form beneath it.
      */}
      <p className="mt-1 min-h-5 text-sm text-foreground-secondary" aria-live="polite">
        {value == null ? t('testimonials:rating.none') : t('testimonials:rating.outOfFive', { rating: value })}
      </p>
    </fieldset>
  )
}
