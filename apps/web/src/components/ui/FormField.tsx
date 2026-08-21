import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  className?: string
  children: ReactNode
}

/** Consistent label/control/error layout so every FursadHub form looks and behaves the same (BRAND_AND_UI_GUIDELINES.md section 11). */
export function FormField({ label, htmlFor, error, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
