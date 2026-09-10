import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'
import { IconButton } from './IconButton'

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { invalid?: boolean; showLabel?: string; hideLabel?: string }
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className, invalid, showLabel, hideLabel, ...props }, ref) => {
  const { t } = useTranslation()
  const resolvedShowLabel = showLabel ?? t('common:password.show')
  const resolvedHideLabel = hideLabel ?? t('common:password.hide')
  const [visible, setVisible] = useState(false)
  return <div className="relative"><input ref={ref} type={visible ? 'text' : 'password'} aria-invalid={invalid || undefined} className={cn('h-10 w-full rounded-md border bg-surface px-3 pr-11 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:bg-control-disabled', invalid ? 'border-danger' : 'border-border', className)} {...props}/><IconButton className="absolute right-0 top-0" label={visible ? resolvedHideLabel : resolvedShowLabel} onClick={() => setVisible(v => !v)}><Icon name={visible ? 'eyeOff' : 'eye'} className="size-5"/></IconButton></div>
})
PasswordInput.displayName = 'PasswordInput'
