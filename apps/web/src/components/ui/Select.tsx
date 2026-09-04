import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, invalid, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-surface px-3 text-sm text-foreground',
        'transition-[border-color,box-shadow] duration-150 ease-in-out disabled:cursor-not-allowed disabled:bg-control-disabled disabled:opacity-70 motion-reduce:transition-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1',
        invalid ? 'border-danger' : 'border-border',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  )
})

Select.displayName = 'Select'
