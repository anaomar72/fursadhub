import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, LoadingSpinner, Pagination } from '../../../components/ui'
import * as notificationsApi from '../api/notificationsApi'
import { NotificationList } from '../components/NotificationList'

/** The full notification history, with the same code-driven rendering the dropdown uses. */
export function NotificationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(0)

  const listQuery = useQuery({
    queryKey: ['notifications', 'page', page, unreadOnly],
    queryFn: () => notificationsApi.listNotifications({ page, size: 20, unreadOnly }),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground">{t('notifications:title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setUnreadOnly((current) => !current)
              setPage(0)
            }}
            aria-pressed={unreadOnly}
          >
            {unreadOnly ? t('notifications:filter.showAll') : t('notifications:filter.unreadOnly')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            {t('notifications:markAllRead')}
          </Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <NotificationList
              notifications={listQuery.data?.content ?? []}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              emptyLabel={unreadOnly ? t('notifications:emptyUnread') : t('notifications:empty')}
            />
          </div>

          {(listQuery.data?.totalPages ?? 0) > 1 && (
            <Pagination
              page={page}
              totalPages={listQuery.data!.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
