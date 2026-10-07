import { forwardRef, type SelectHTMLAttributes } from 'react'
import { CONTROL_HEIGHT, controlClasses } from './controlStyles'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, invalid, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={controlClasses(invalid, CONTROL_HEIGHT, 'px-3', className)}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  )
})

Select.displayName = 'Select'
