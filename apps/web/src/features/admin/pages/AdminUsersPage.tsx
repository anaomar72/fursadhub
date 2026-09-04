import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Alert,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/ui'
import * as adminApi from '../api/adminApi'
import { USER_STATUS_TONE } from '../statusTone'
import { formatDate } from '../../../lib/utils/formatDate'
import type { AdminUser, UserStatus } from '../types'

const FILTER_STATUSES: UserStatus[] = ['ACTIVE', 'SUSPENDED', 'PENDING_CONTACT_VERIFICATION', 'CLOSED']

/**
 * Every account on the platform (Phase 7 "Admin: account administration").
 *
 * <p>A directory, not a control panel: the row-level actions that used to live here have moved to
 * the account's own page, where the administrator can see what they are about to suspend. Search,
 * status filter and paging are all the server's — {@code AdminController.searchUsers} takes `query`,
 * `status` and a {@code Pageable} — so nothing is filtered client-side over a partial page.
 *
 * <p>There is no impersonation control here and none anywhere else in FursadHub. Phase 7 forbids it,
 * and an administrator who could act as another user would make every audit event in the system
 * ambiguous about who really did the thing.
 *
 * <p>The table shows no password material of any kind, because {@code AdminUserResponse} carries
 * none — not the hash, not token state, nothing (CLAUDE.md section 68).
 */
export function AdminUsersPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [page, setPage] = useState(0)

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', submittedQuery, status, page],
    queryFn: () =>
      adminApi.searchUsers({
        query: submittedQuery || undefined,
        status: status === '' ? undefined : status,
        page,
      }),
  })

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'email',
      header: t('admin:users.email'),
      render: (user) => (
        <Link
          to={`/admin/users/${user.id}`}
          className="rounded font-medium text-foreground hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {user.email}
        </Link>
      ),
    },
    {
      key: 'status',
      header: t('admin:users.status'),
      render: (user) => (
        <StatusBadge tone={USER_STATUS_TONE[user.status]}>
          {t(`admin:statusLabels.${user.status}`)}
        </StatusBadge>
      ),
    },
    {
      key: 'emailVerified',
      header: t('admin:users.emailVerified'),
      render: (user) =>
        user.emailVerifiedAt ? (
          <span className="text-foreground-secondary">{formatDate(user.emailVerifiedAt)}</span>
        ) : (
          <span className="text-muted">{t('admin:users.notVerified')}</span>
        ),
    },
    {
      key: 'locale',
      header: t('admin:users.locale'),
      render: (user) => (
        <span className="text-foreground-secondary">
          {t(`admin:locales.${user.preferredLocale}`, user.preferredLocale)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('admin:users.registered'),
      render: (user) => <span className="text-foreground-secondary">{formatDate(user.createdAt)}</span>,
    },
  ]

  const data = usersQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:users.title')}
        description={t('admin:users.description')}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedQuery(query)
          setPage(0)
        }}
      >
        <FilterBar
          search={
            <SearchInput
              label={t('admin:users.searchLabel')}
              placeholder={t('admin:users.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
        >
          <Select
            aria-label={t('admin:users.statusFilter')}
            className="sm:w-56"
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
        </FilterBar>
      </form>

      {usersQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : usersQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void usersQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:users.resultCount', { count: data?.totalElements ?? 0 })}
          </p>

          {data && data.totalElements > 0 && data.content.length === 0 && (
            <Alert tone="info">{t('admin:users.pageEmpty')}</Alert>
          )}

          <DataTable
            caption={t('admin:users.title')}
            columns={columns}
            rows={data?.content ?? []}
            rowKey={(user) => user.id}
            empty={
              <EmptyState
                title={t('admin:users.empty')}
                description={t('admin:users.emptyHint')}
              />
            }
          />

          {(data?.totalPages ?? 0) > 1 && (
            <Pagination page={page} totalPages={data!.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}
