import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, FormField, Input, LoadingSpinner, Pagination, PageHeader, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import type { UserStatus } from '../types'

const STATUS_TONE: Record<UserStatus, StatusTone> = {
  PENDING_CONTACT_VERIFICATION: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  CLOSED: 'neutral',
}

const FILTER_STATUSES: UserStatus[] = ['ACTIVE', 'SUSPENDED', 'PENDING_CONTACT_VERIFICATION', 'CLOSED']

/**
 * Account administration (Phase 7 "Admin: account suspension").
 *
 * <p>There is no impersonation control here and none anywhere else: Phase 7 forbids it, and an
 * administrator who could act as another user would make every audit event ambiguous about who
 * really acted.
 */
export function AdminUsersPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [suspending, setSuspending] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', submittedQuery, status, page],
    queryFn: () =>
      adminApi.searchUsers({
        query: submittedQuery || undefined,
        status: status === '' ? undefined : status,
        page,
      }),
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
  }

  const suspendMutation = useMutation({
    mutationFn: ({ userId, note }: { userId: string; note: string }) => {
      setError(null)
      return adminApi.suspendUser(userId, note).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'users', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setSuspending(null)
      setReason('')
      invalidate()
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => {
      setError(null)
      return adminApi.reactivateUser(userId).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'users', cause))
        throw cause
      })
    },
    onSuccess: invalidate,
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('admin:users.title')} />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedQuery(query)
          setPage(0)
        }}
      >
        <FormField label={t('admin:users.searchLabel')} htmlFor="user-query" className="w-64">
          <Input
            id="user-query"
            type="email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin:users.searchPlaceholder')}
          />
        </FormField>
        <FormField label={t('admin:users.statusFilter')} htmlFor="user-status" className="w-48">
          <Select
            id="user-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as UserStatus | '')
              setPage(0)
            }}
          >
            <option value="">{t('admin:users.allStatuses')}</option>
            {FILTER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:statusLabels.${value}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <Button type="submit" variant="outline">
          {t('admin:users.search')}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {usersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (usersQuery.data?.content ?? []).length === 0 ? (
        <EmptyState title={t('admin:users.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-border text-left text-foreground-secondary">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('admin:users.email')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('admin:users.status')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('admin:users.created')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  <span className="sr-only">{t('admin:users.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersQuery.data!.content.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2 text-foreground">{user.email}</td>
                  <td className="px-4 py-2">
                    <StatusBadge tone={STATUS_TONE[user.status]}>
                      {t(`admin:statusLabels.${user.status}`)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-2 text-foreground-secondary">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    {suspending === user.id ? (
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          suspendMutation.mutate({ userId: user.id, note: reason })
                        }}
                      >
                        <Input
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder={t('admin:users.reasonPlaceholder')}
                          aria-label={t('admin:users.reasonLabel')}
                          maxLength={500}
                          className="w-56"
                        />
                        <Button type="submit" size="sm" variant="danger" loading={suspendMutation.isPending}>
                          {t('admin:users.confirmSuspend')}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setSuspending(null)}>
                          {t('admin:users.cancel')}
                        </Button>
                      </form>
                    ) : user.status === 'SUSPENDED' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => reactivateMutation.mutate(user.id)}
                        disabled={reactivateMutation.isPending}
                      >
                        {t('admin:users.reactivate')}
                      </Button>
                    ) : user.status === 'CLOSED' ? (
                      <span className="text-xs text-foreground-secondary">{t('admin:users.noActions')}</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSuspending(user.id)
                          setReason('')
                        }}
                      >
                        {t('admin:users.suspend')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(usersQuery.data?.totalPages ?? 0) > 1 && (
        <Pagination page={page} totalPages={usersQuery.data!.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
