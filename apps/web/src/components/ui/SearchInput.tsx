import { forwardRef, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { CONTROL_HEIGHT, controlClasses } from './controlStyles'
import { Icon } from './Icon'

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Classes for the wrapping label — grid placement when the field sits in a toolbar. */
  wrapperClassName?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ label, className, wrapperClassName, ...props }, ref) => {
  const { t } = useTranslation()
  return (
    <label className={cn('relative block min-w-0', wrapperClassName)}>
      <span className="sr-only">{label ?? t('common:a11y.search')}</span>
      <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        ref={ref}
        type="search"
        className={controlClasses(false, CONTROL_HEIGHT, 'ps-9 pe-3', className)}
        {...props}
      />
    </label>
  )
})
SearchInput.displayName = 'SearchInput'
