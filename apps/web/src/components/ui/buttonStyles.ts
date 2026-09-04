import { cn } from '../../lib/utils/cn'

export const BUTTON_VARIANT_CLASSES = {
  primary: 'bg-brand-primary text-on-brand hover:bg-brand-accent',
  secondary: 'bg-brand-secondary text-on-brand hover:bg-brand-secondary/90',
  outline: 'border border-border bg-transparent text-foreground hover:bg-surface-muted',
  ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
  danger: 'bg-danger text-on-brand hover:opacity-90',
} as const

export const BUTTON_SIZE_CLASSES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANT_CLASSES
export type ButtonSize = keyof typeof BUTTON_SIZE_CLASSES

/**
 * The one place FursadHub's button appearance is defined, so a `<button>` and a navigational
 * `<a>` that are meant to look identical actually are — previously a "primary button" link was
 * hand-written Tailwind that had already drifted from the real Button (`font-medium` against
 * `font-semibold`, no active/motion treatment).
 *
 * <p>Shared by {@link Button} and {@link ButtonLink}. Anything that changes here changes both.
 */
export function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:transform-none',
    BUTTON_VARIANT_CLASSES[variant],
    BUTTON_SIZE_CLASSES[size],
    className,
  )
}
