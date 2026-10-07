import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  /**
   * `block` (default) — the whole page or main region could not load: a centred, bordered message
   * with a retry button.
   *
   * `inline` — ONE section failed while the rest of the page is fine (a dashboard panel, an
   * enrichment query). A single quiet row with the alert icon and a retry link: it says what is
   * missing without painting a large red box in the middle of working content. Defaults its title to
   * "This section couldn't be loaded."
   */
  variant?: 'block' | 'inline'
  className?: string
}

/**
 * A failed load. Never shows technical detail — the caller passes a human sentence, or the
 * translated default is used. Announced once through `role="alert"`.
 */
export function ErrorState({ title, description, onRetry, retryLabel, variant = 'block', className }: ErrorStateProps) {
  const { t } = useTranslation()
  const resolvedRetryLabel = retryLabel ?? t('common:actions.retry')

  if (variant === 'inline') {
    return (
      <div role="alert" className={cn('flex flex-wrap items-start gap-x-3 gap-y-1 py-2 text-body', className)}>
        <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{title ?? t('common:status.sectionError')}</p>
          {description && <p className="mt-0.5 text-foreground-secondary">{description}</p>}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {resolvedRetryLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      role="alert"
      // A tinted ground with a soft edge of the same hue — serious without shouting. The full-
      // strength danger border made every failed query the loudest thing on the screen.
      className={cn(
        'flex min-h-32 flex-col items-center justify-center rounded-lg border border-danger/25 bg-danger-bg p-6 text-center',
        className,
      )}
    >
      <Icon name="alert" className="size-7 text-danger" />
      <h3 className="mt-2 font-display text-title-panel text-foreground">{title ?? t('common:status.error')}</h3>
      {description && <p className="mt-1 max-w-md text-body text-foreground-secondary">{description}</p>}
      {onRetry && (
        <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
          {resolvedRetryLabel}
        </Button>
      )}
    </div>
  )
}
