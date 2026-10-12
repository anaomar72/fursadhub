import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { CONTROL_HEIGHT, controlClasses } from './controlStyles'
import { Icon } from './Icon'
import { IconButton } from './IconButton'

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { invalid?: boolean; showLabel?: string; hideLabel?: string }

/** A text control with a show/hide toggle. Shares its appearance with {@link Input} through `controlClasses`. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className, invalid, showLabel, hideLabel, ...props }, ref) => {
  const { t } = useTranslation()
  const resolvedShowLabel = showLabel ?? t('common:password.show')
  const resolvedHideLabel = hideLabel ?? t('common:password.hide')
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        aria-invalid={invalid || undefined}
        // `pe-11` (logical): the toggle sits at the inline end, so the text must stop short of it.
        className={controlClasses(invalid, CONTROL_HEIGHT, 'ps-3 pe-11', className)}
        {...props}
      />
      <IconButton
        className="absolute end-0 top-0"
        label={visible ? resolvedHideLabel : resolvedShowLabel}
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} className="size-5" />
      </IconButton>
    </div>
  )
})
PasswordInput.displayName = 'PasswordInput'
