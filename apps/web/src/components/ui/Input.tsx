import { forwardRef, type InputHTMLAttributes } from 'react'
import { CONTROL_HEIGHT, controlClasses } from './controlStyles'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={controlClasses(invalid, CONTROL_HEIGHT, 'px-3', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

Input.displayName = 'Input'
