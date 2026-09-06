import { forwardRef, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'
export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string }
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ label, className, ...props }, ref) => { const { t } = useTranslation(); return <label className="relative block min-w-0"><span className="sr-only">{label??t('common:a11y.search')}</span><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"/><input ref={ref} type="search" className={cn('h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:bg-control-disabled', className)} {...props}/></label> })
SearchInput.displayName='SearchInput'
