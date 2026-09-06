import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { BUTTON_SIZE_CLASSES, BUTTON_VARIANT_CLASSES, buttonClasses } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANT_CLASSES
  size?: keyof typeof BUTTON_SIZE_CLASSES
  loading?: boolean
}

/**
 * Base interactive control for FursadHub. While `loading`, the button stays
 * disabled and keeps its width stable rather than collapsing to a spinner
 * (see docs/product/BRAND_AND_UI_GUIDELINES.md section 19).
 *
 * <p>Appearance lives in `buttonStyles.ts` so {@link ButtonLink} can be exactly identical — use
 * that, not this, when the control navigates rather than acts.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
