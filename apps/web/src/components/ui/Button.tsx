import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'
import { BUTTON_SIZE_CLASSES, BUTTON_VARIANT_CLASSES, buttonClasses } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANT_CLASSES
  size?: keyof typeof BUTTON_SIZE_CLASSES
  loading?: boolean
}

/**
 * Base interactive control for FursadHub. While `loading`, the button stays disabled and keeps its
 * width stable rather than collapsing to a spinner (see
 * CLAUDE.md section 57).
 *
 * <p><strong>How the width is actually held.</strong> The spinner is overlaid on the centre of the
 * button and the label is hidden with `opacity-0` — it keeps its box, so it keeps reserving exactly
 * the space it occupied a moment ago. Prepending a visible spinner instead, which is what this did
 * before, widened the control by the spinner plus its gap the instant it was pressed: "Submit for
 * review" grew by 24px under the pointer, and every control after it in the row shifted. The label
 * stays in the accessible tree (it is only visually transparent), and `aria-busy` is what announces
 * the pending state.
 *
 * <p>Appearance lives in `buttonStyles.ts` so {@link ButtonLink} can be exactly identical — use
 * that, not this, when the control navigates rather than acts.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, cn('relative', className))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          </span>
        )}
        <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
      </button>
    )
  },
)

Button.displayName = 'Button'
