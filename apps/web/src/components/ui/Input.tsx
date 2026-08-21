import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-surface px-3 text-sm text-foreground placeholder:text-muted',
        'transition-colors duration-150 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
        invalid ? 'border-danger' : 'border-border',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

Input.displayName = 'Input'
