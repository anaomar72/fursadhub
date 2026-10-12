import { cn } from '../../lib/utils/cn'


export const BUTTON_VARIANT_CLASSES = {
  primary: 'bg-action-primary text-on-action shadow-xs hover:bg-action-primary-hover',
  secondary: 'bg-brand-navy text-white shadow-xs hover:bg-brand-navy-strong',
  outline: 'border border-border-strong bg-surface text-foreground shadow-xs hover:bg-control-hover',
  ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
  danger: 'bg-action-danger text-on-action shadow-xs hover:bg-action-danger-hover',
} as const


export const BUTTON_SIZE_CLASSES = {
  sm: 'min-h-9 px-3.5 py-2 text-label',
  md: 'min-h-10 px-4 py-2.5 text-body',
  lg: 'fh-button-lg min-h-12 px-6 py-3 text-body-lg',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANT_CLASSES
export type ButtonSize = keyof typeof BUTTON_SIZE_CLASSES


export function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return cn(
    'fh-button inline-flex min-w-0 max-w-full break-words whitespace-normal text-center items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-ui',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:transform-none',
    BUTTON_VARIANT_CLASSES[variant],
    BUTTON_SIZE_CLASSES[size],
    className,
  )
}
