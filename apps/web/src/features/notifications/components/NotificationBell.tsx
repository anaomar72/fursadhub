import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as notificationsApi from '../api/notificationsApi'
import { NotificationList } from './NotificationList'

/** How often the unread badge refreshes. Long enough to be cheap, short enough to feel live. */
const UNREAD_POLL_MS = 60_000

/**
 * The unread badge and its dropdown, shown in every role area's topbar.
 *
 * <p>Only the COUNT polls; the list itself is fetched when the panel opens. That keeps the steady
 * state to one small request a minute per signed-in tab, rather than repeatedly pulling a page of
 * notifications nobody is looking at.
 *
 * <p>No WebSocket, deliberately — CLAUDE.md section 3 rules them out for the pilot, and a minute of
 * latency on an in-app badge is not a problem worth that infrastructure.
 */
export function NotificationBell() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: UNREAD_POLL_MS,
    // A failure here must never surface as an error state in the topbar: the badge is an
    // affordance, not the page.
    retry: false,
  })

  const listQuery = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.listNotifications({ size: 10 }),
    enabled: open,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markNotificationRead,
    onSuccess: invalidate,
  })
  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: invalidate,
  })

  // Close on an outside click or Escape — the panel is a menu, and a menu that traps focus or
  // refuses to close is worse than no menu.
  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const unreadCount = unreadQuery.data?.unreadCount ?? 0

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          unreadCount > 0
            ? t('notifications:bell.labelWithCount', { count: unreadCount })
            : t('notifications:bell.label')
        }
        className="relative rounded-md p-2 text-foreground-secondary transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2.5a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 10.5v-3a5 5 0 0 0-5-5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M8 15.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-brand-primary px-1 text-[10px] font-semibold leading-4 text-on-brand">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold text-foreground">{t('notifications:title')}</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-xs font-medium text-link underline-offset-2 hover:underline disabled:opacity-60"
              >
                {t('notifications:markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {listQuery.isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-foreground-secondary">
                {t('common:status.loading')}
              </p>
            ) : (
              <NotificationList
                notifications={listQuery.data?.content ?? []}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onNavigate={() => setOpen(false)}
                emptyLabel={t('notifications:empty')}
              />
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5 text-center">
            <Link
              to="/account/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-link underline-offset-2 hover:underline"
            >
              {t('notifications:viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
