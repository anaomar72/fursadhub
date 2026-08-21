import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, invalid, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted',
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

Textarea.displayName = 'Textarea'
