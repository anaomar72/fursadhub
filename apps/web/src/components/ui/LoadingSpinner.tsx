import { cn } from '../../lib/utils/cn'

const SIZE_CLASSES = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
} as const

export interface LoadingSpinnerProps {
  size?: keyof typeof SIZE_CLASSES
  className?: string
  /**
   * Announce this spinner as its own live region under this name. Pass one ONLY when the spinner is
   * the sole indication that something is loading — a translated string, never a literal.
   */
  label?: string
}

/**
 * Inline/compact loading affordance for button actions and blocking operations.
 *
 * <p>Decorative by default. It previously declared `role="status"` with a hardcoded English
 * "Loading" on every instance, which meant the one inside {@link LoadingState} announced an
 * untranslated second live region on top of that component's own translated one. A spinning ring is
 * a picture of waiting; the words belong to whatever region owns the wait.
 */
export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        // Deliberately keeps spinning under reduced motion. The rotation is not decoration here —
        // it IS the message that something is still happening, and a frozen ring says the opposite.
        'inline-block animate-spin rounded-full border-current border-t-transparent text-brand-accent-ink',
        SIZE_CLASSES[size],
        className,
      )}
    />
  )
}
