import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lifts and gains a brand-colored border on hover — for a card that is itself a control (wraps a
   * `<Link>`/`<button>`, or is clickable via its own `onClick`). Static content cards should not set
   * this — motion should only ever promise something is interactive (BRAND_AND_UI_GUIDELINES.md
   * section 12). */
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const

/**
 * The one bordered-surface container for FursadHub (BRAND_AND_UI_GUIDELINES.md section 4). Lists,
 * detail summaries and dashboard tiles all share this shape rather than each feature reaching for
 * its own `rounded-lg border ...` string — see `DashboardActionCard`/the landing page's door cards,
 * which this generalizes.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padding = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-surface',
          PADDING_CLASSES[padding],
          interactive &&
            cn(
              'transition-all duration-150 ease-in-out',
              'hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md',
            ),
          className,
        )}
        {...props}
      />
    )
  },
)

Card.displayName = 'Card'
