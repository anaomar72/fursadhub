import { cn } from '../../lib/utils/cn'

const SIZE_CLASSES = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
} as const

export interface LoadingSpinnerProps {
  size?: keyof typeof SIZE_CLASSES
  className?: string
  label?: string
}

/** Inline/compact loading affordance for button actions and blocking operations. */
export function LoadingSpinner({ size = 'md', className, label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-brand-primary',
        SIZE_CLASSES[size],
        className,
      )}
    />
  )
}
