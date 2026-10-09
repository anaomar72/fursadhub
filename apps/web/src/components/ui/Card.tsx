import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Gains a resting shadow, and a brand border plus a deeper shadow on hover — for a card that is
   * itself a control (wraps a `<Link>`/`<button>`, or is clickable via its own `onClick`). Static
   * content cards should not set this: elevation and hover should only ever promise interactivity. */
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
 * The bordered-surface container for a repeated ITEM — one of many in a grid or list.
 *
 * <p>Roles, and the component each one uses:
 * <ul>
 *   <li><strong>interactive</strong> — a tile the whole of which is a control: `<Card interactive>`.</li>
 *   <li><strong>metric</strong> — a KPI figure: `Metric`, inside a panel or a figures list.</li>
 *   <li><strong>entity</strong> — an organization/university/person summary: `EntityCard`.</li>
 *   <li><strong>opportunity</strong> — an internship: `InternshipCard`.</li>
 * </ul>
 * A titled module of a page (header + body) is a {@link Panel}, not a Card. Never put a Card inside
 * a Card or a Panel — group with spacing or an inset region instead.
 *
 * <p>Elevation follows the surface rules in `design-system/README.md`: a static card is border only;
 * only an interactive card rests on `shadow-xs` and rises to `shadow-md` on hover.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padding = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        // The corner comes from the workspace family: softer in the student workspace, squarer in
        // the organization and university ones. Outside a workspace — the public site, auth — it is
        // the 16px surface radius.
        style={{ borderRadius: 'var(--workspace-radius, var(--radius-surface))' }}
        className={cn(
          'min-w-0 rounded-xl border border-border bg-surface',
          PADDING_CLASSES[padding],
          // Emphasis without geometry. The card used to lift on hover, which moves whatever sits
          // under the pointer. Border and shadow carry the same signal while the layout holds still.
          interactive &&
            cn(
              'shadow-xs transition-[border-color,box-shadow] duration-150 ease-in-out motion-reduce:transition-none',
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
