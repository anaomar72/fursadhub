import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  invalid?: boolean
}

/** A labelled checkbox, sized for a tap target and wired for keyboard focus/error state. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, invalid, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-foreground', className)}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={invalid || undefined}
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 rounded border bg-surface text-brand-primary',
            'transition-colors duration-150 ease-in-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
            invalid ? 'border-danger' : 'border-border',
          )}
          {...props}
        />
        <span>{label}</span>
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'
