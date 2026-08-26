import { apiFetch } from '../../../lib/api/client'
import type { NotificationPage } from '../types'

export function listNotifications(options: { unreadOnly?: boolean; page?: number; size?: number } = {}) {
  const params = new URLSearchParams()
  if (options.unreadOnly) params.set('unreadOnly', 'true')
  if (options.page !== undefined) params.set('page', String(options.page))
  if (options.size !== undefined) params.set('size', String(options.size))
  const query = params.toString()
  return apiFetch<NotificationPage>(`/me/notifications${query ? `?${query}` : ''}`)
}

export function getUnreadCount() {
  return apiFetch<{ unreadCount: number }>('/me/notifications/unread-count')
}

export function markNotificationRead(notificationId: string) {
  return apiFetch<{ message: string }>(`/me/notifications/${notificationId}/read`, { method: 'POST' })
}

export function markAllNotificationsRead() {
  return apiFetch<{ message: string }>('/me/notifications/read-all', { method: 'POST' })
}
