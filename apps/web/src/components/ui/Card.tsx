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
        // The corner comes from the workspace family: softer in the student workspace, squarer in
        // the organization and university ones. The fallback is exactly what `rounded-xl` gives, so
        // outside a workspace — the public site, auth — this card is unchanged.
        style={{ borderRadius: 'var(--workspace-radius, var(--radius-xl))' }}
        className={cn(
          'min-w-0 rounded-xl border border-border bg-surface shadow-xs',
          PADDING_CLASSES[padding],
          // Emphasis without geometry. The card used to lift on hover, which moves whatever sits
          // under the pointer — a link the user was about to click shifts half a step away, and in
          // a grid the neighbouring cards stay put so the row visibly breaks alignment. Border and
          // shadow carry the same "this is interactive" signal while the layout holds still.
          interactive &&
            cn(
              'transition-[border-color,box-shadow] duration-150 ease-in-out motion-reduce:transition-none',
              'hover:border-brand-accent hover:shadow-md',
            ),
          className,
        )}
        {...props}
      />
    )
  },
)

Card.displayName = 'Card'
