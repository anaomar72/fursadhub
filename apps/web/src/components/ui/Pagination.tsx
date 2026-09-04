import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Button } from './Button'

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

/** Minimal prev/next + page-of-total pager, used by paginated list views. */
export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const { t } = useTranslation()

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className={cn('flex flex-wrap items-center justify-center gap-3', className)} aria-label={t('common:pagination.label')}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 0}
      >
        {t('common:pagination.previous')}
      </Button>
      <span className="text-sm text-foreground-secondary" aria-live="polite">
        {t('common:pagination.pageOf', { page: page + 1, totalPages })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
      >
        {t('common:pagination.next')}
      </Button>
    </nav>
  )
}
