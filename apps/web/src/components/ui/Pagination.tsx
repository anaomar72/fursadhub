import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'

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
    <nav className={cn('flex items-center justify-center gap-3', className)} aria-label={t('common:pagination.label')}>
      <button
        type="button"
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 0}
      >
        {t('common:pagination.previous')}
      </button>
      <span className="text-sm text-foreground-secondary">
        {t('common:pagination.pageOf', { page: page + 1, totalPages })}
      </span>
      <button
        type="button"
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
      >
        {t('common:pagination.next')}
      </button>
    </nav>
  )
}
