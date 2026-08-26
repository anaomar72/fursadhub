import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '../../../lib/utils/cn'
import type { NotificationItem } from '../types'

interface NotificationListProps {
  notifications: NotificationItem[]
  onMarkRead: (notificationId: string) => void
  /** Called after following a notification's link, so a dropdown can close itself. */
  onNavigate?: () => void
  emptyLabel: string
}

/**
 * Renders notifications from their TYPE CODE, never from server-supplied text.
 *
 * <p>Each row looks up `notifications:types.<TYPE>` with the notification's payload as interpolation
 * parameters. That is what makes CLAUDE.md section 56 work here: the same stored row reads in English
 * or Somali depending on who is looking at it, and revised wording applies retroactively to
 * notifications that already exist.
 *
 * <p>An unrecognised code — a newer API, an older client — falls back to a generic line rather than
 * rendering a raw enum name at the user.
 */
export function NotificationList({ notifications, onMarkRead, onNavigate, emptyLabel }: NotificationListProps) {
  const { t } = useTranslation()

  if (notifications.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-foreground-secondary">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border">
      {notifications.map((notification) => {
        // A code this client does not know — a newer API, an older bundle — falls back to a generic
        // line rather than rendering a raw enum name at the reader. `defaultValue: ''` is what makes
        // the miss detectable: i18next otherwise echoes back a key, in a form that varies.
        const text =
          t(`notifications:types.${notification.type}`, { ...notification.payload, defaultValue: '' }) ||
          t('notifications:types.GENERIC')
        const unread = notification.readAt === null

        return (
          <li key={notification.id} className={cn('flex gap-3 px-4 py-3', unread && 'bg-surface-muted')}>
            {/*
              The dot is decorative. Unread state is also carried by the visible "New" label below,
              so it is never communicated by colour alone (BRAND_AND_UI_GUIDELINES.md accessibility).
            */}
            <span
              aria-hidden="true"
              className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-brand-primary' : 'bg-transparent')}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm text-foreground">{text}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-secondary">
                <time dateTime={notification.createdAt}>
                  {new Date(notification.createdAt).toLocaleString()}
                </time>
                {unread && <span className="font-medium text-brand-primary">{t('notifications:unread')}</span>}
                {notification.linkPath && (
                  <Link
                    to={notification.linkPath}
                    onClick={() => {
                      if (unread) onMarkRead(notification.id)
                      onNavigate?.()
                    }}
                    className="font-medium text-brand-primary underline-offset-2 hover:underline"
                  >
                    {t('notifications:open')}
                  </Link>
                )}
                {unread && (
                  <button
                    type="button"
                    onClick={() => onMarkRead(notification.id)}
                    className="font-medium text-foreground-secondary underline-offset-2 hover:underline"
                  >
                    {t('notifications:markRead')}
                  </button>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
