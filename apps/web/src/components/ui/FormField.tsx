import { cloneElement, Fragment, isValidElement, type ReactNode, type AriaAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'

export interface FormFieldProps {
  label: string
  labelIcon?: ReactNode
  htmlFor: string
  /** Guidance shown under the label — what the field means, not what went wrong. */
  hint?: string
  error?: string
  /**
   * A confirmation that the value was checked and is good — "Username is available". Only for
   * fields that genuinely verify something; ordinary valid input needs no green text. Ignored while
   * `error` is set.
   */
  success?: string
  /**
   * Marks the field OPTIONAL with a visible, translated "Optional" beside the label.
   *
   * <p>FursadHub marks the exception rather than the rule: most fields in its forms are required,
   * so labelling every one of them with an asterisk would be noise — and an asterisk alone means
   * nothing to a screen reader or to someone who has not learned the convention. "Optional" is a
   * word, in the reader's own language.
   */
  optional?: boolean
  /** Sets `aria-required` on the control, so assistive technology hears what the label does not show. */
  required?: boolean
  className?: string
  children: ReactNode
}

/**
 * Consistent label / hint / control / message layout so every FursadHub form looks and behaves the
 * same. Wires `id`, `aria-describedby`, `aria-invalid` and `aria-required` onto a single child
 * control, so call sites never repeat the ids.
 */
export function FormField({ label, labelIcon, htmlFor, hint, error, success, optional = false, required = false, className, children }: FormFieldProps) {
  const { t } = useTranslation()
  const hintId = `${htmlFor}-hint`
  const errorId = `${htmlFor}-error`
  const successId = `${htmlFor}-success`
  const showSuccess = Boolean(success) && !error
  const describedBy = [hint && hintId, error && errorId, showSuccess && successId].filter(Boolean).join(' ') || undefined

  // Only a single real element can safely be cloned; anything else (a fragment, a composite input
  // group) still gets the visible text, just without the automatic association.
  const control =
    isValidElement<AriaAttributes & { id?: string }>(children) && children.type !== Fragment
      ? cloneElement(children, {
          id: children.props.id ?? htmlFor,
          'aria-invalid': error ? true : children.props['aria-invalid'],
          'aria-required': required ? true : children.props['aria-required'],
          'aria-describedby': [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
        })
      : children

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {/* Label and "Optional" wrap independently: a long Somali label pushes the marker to the next
          line instead of squeezing it or the label into an ellipsis. */}
      <label htmlFor={htmlFor} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-label text-foreground">
        <span className="inline-flex min-w-0 items-center gap-2 break-words">
          {labelIcon && <span aria-hidden="true">{labelIcon}</span>}
          {label}
        </span>
        {optional && <span className="text-caption font-normal text-muted">{t('common:form.optional')}</span>}
      </label>
      {/* Above the control, not below it: a hint that explains the field is only useful before it
          is filled in. Errors stay below, next to what the reader is correcting. */}
      {hint && (
        <p id={hintId} className="-mt-0.5 text-caption text-foreground-secondary">
          {hint}
        </p>
      )}
      {control}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-body text-danger" role="alert">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {showSuccess && (
        <p id={successId} className="flex items-start gap-1.5 text-body text-success" role="status">
          <Icon name="check" className="mt-0.5 size-4 shrink-0" />
          {success}
        </p>
      )}
    </div>
  )
}
