import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { controlClasses } from './controlStyles'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, invalid, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={controlClasses(invalid, 'min-h-24 px-3 py-2', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'
