import { cloneElement, isValidElement, useId, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface FormFieldProps {
  label: string
  htmlFor: string
  /** Guidance shown under the label — what the field means, not what went wrong. */
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

/** Consistent label/control/error layout so every FursadHub form looks and behaves the same (BRAND_AND_UI_GUIDELINES.md section 11). */
export function FormField({ label, htmlFor, hint, error, className, children }: FormFieldProps) {
  const hintId = useId()
  const errorId = useId()
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  // A screen-reader user who tabs straight to the control still needs the hint/error read out —
  // wiring aria-describedby here, once, means every call site gets it without repeating the ids.
  // Only a single real element can safely be cloned; anything else (a fragment, a composite input
  // group) still gets the visible text, just without the automatic association.
  const control =
    describedBy && isValidElement<{ 'aria-describedby'?: string }>(children)
      ? cloneElement(children, {
          'aria-describedby': [children.props['aria-describedby'], describedBy].filter(Boolean).join(' '),
        })
      : children

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {/* Above the control, not below it: a hint that explains the field is only useful before it
          is filled in. Errors stay below, next to what the reader is correcting. */}
      {hint && (
        <p id={hintId} className="-mt-0.5 text-xs text-foreground-secondary">
          {hint}
        </p>
      )}
      {control}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
