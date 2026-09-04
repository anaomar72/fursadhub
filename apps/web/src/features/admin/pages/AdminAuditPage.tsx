import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Alert,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingState,
  PageHeader,
  Pagination,
  Select,
  type DataTableColumn,
} from '../../../components/ui'
import * as adminApi from '../api/adminApi'
import { formatDateTime } from '../../../lib/utils/formatDate'
import type { AuditEvent } from '../types'

/** A `date` input gives a calendar day; the API wants an instant, so the day is widened to its edges. */
function startOfDay(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined
}
function endOfDay(value: string): string | undefined {
  return value ? new Date(`${value}T23:59:59.999Z`).toISOString() : undefined
}

/**
 * The audit trail (Phase 7 "Admin: audit viewing").
 *
 * <p>Read-only in the strongest sense: there is no control here to edit or delete an event, and no
 * endpoint behind one either. The trail is append-only (CLAUDE.md section 51) — one an administrator
 * could tidy up would be worthless exactly when it mattered.
 *
 * <p>All four filters are the server's. `eventType`, `userId`, `from` and `to` are parameters
 * {@code AdminComplianceController} has always accepted; the date pair was simply never wired up in
 * the web app, which meant investigating an incident meant paging through everything since.
 *
 * <p>The event type list comes from {@code GET /admin/audit-events/types} — the DISTINCT types
 * actually present in the trail — so the filter can never offer an event FursadHub does not record.
 *
 * <p>Nothing shown here needs redacting: FursadHub never writes passwords, tokens, Authorization
 * headers, storage keys or document content into audit metadata (CLAUDE.md section 68).
 */
export function AdminAuditPage() {
  const { t } = useTranslation()
  const [eventType, setEventType] = useState('')
  const [userId, setUserId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState({ eventType: '', userId: '', from: '', to: '' })
  const [page, setPage] = useState(0)

  const typesQuery = useQuery({
    queryKey: ['admin', 'audit', 'types'],
    queryFn: adminApi.listAuditEventTypes,
  })

  const eventsQuery = useQuery({
    queryKey: ['admin', 'audit', applied, page],
    queryFn: () =>
      adminApi.listAuditEvents({
        eventType: applied.eventType || undefined,
        userId: applied.userId || undefined,
        from: startOfDay(applied.from),
        to: endOfDay(applied.to),
        page,
      }),
  })

  const invalidRange = from !== '' && to !== '' && from > to

  const columns: DataTableColumn<AuditEvent>[] = [
    {
      key: 'occurredAt',
      header: t('admin:audit.occurredAt'),
      className: 'whitespace-nowrap',
      render: (event) => (
        <span className="text-foreground-secondary">{formatDateTime(event.occurredAt)}</span>
      ),
    },
    {
      // Stable machine codes, shown verbatim — an administrator reading an audit trail needs the
      // exact code, not a paraphrase they would then have to translate back to grep for.
      key: 'eventType',
      header: t('admin:audit.eventType'),
      render: (event) => <span className="font-mono text-xs text-foreground">{event.eventType}</span>,
    },
    {
      key: 'actor',
      header: t('admin:audit.actor'),
      render: (event) =>
        event.userId ? (
          <Link
            to={`/admin/users/${event.userId}`}
            className="rounded font-mono text-xs text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {event.userId}
          </Link>
        ) : (
          <span className="text-muted">{t('admin:audit.system')}</span>
        ),
    },
    {
      key: 'ip',
      header: t('admin:audit.ipAddress'),
      render: (event) => (
        <span className="font-mono text-xs text-foreground-secondary">{event.ipAddress ?? '—'}</span>
      ),
    },
    {
      key: 'metadata',
      header: t('admin:audit.metadata'),
      render: (event) => (
        <span className="text-xs text-foreground-secondary">{event.metadata ?? '—'}</span>
      ),
    },
  ]

  const data = eventsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:audit.title')}
        description={t('admin:audit.description')}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (invalidRange) return
          setApplied({ eventType, userId, from, to })
          setPage(0)
        }}
      >
        <FilterBar
          actions={
            <>
              <Button type="submit" variant="outline" size="sm" disabled={invalidRange}>
                {t('common:actions.apply')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEventType('')
                  setUserId('')
                  setFrom('')
                  setTo('')
                  setApplied({ eventType: '', userId: '', from: '', to: '' })
                  setPage(0)
                }}
              >
                {t('common:actions.clear')}
              </Button>
            </>
          }
        >
          <Select
            aria-label={t('admin:audit.typeFilter')}
            className="sm:w-60"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
          >
            <option value="">{t('admin:audit.allTypes')}</option>
            {(typesQuery.data ?? []).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Input
            aria-label={t('admin:audit.actorFilter')}
            className="sm:w-64"
            placeholder={t('admin:audit.actorPlaceholder')}
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
          <Input
            type="date"
            aria-label={t('admin:audit.from')}
            className="sm:w-44"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            type="date"
            aria-label={t('admin:audit.to')}
            className="sm:w-44"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </FilterBar>
      </form>

      {invalidRange && <Alert tone="warning">{t('admin:audit.invalidRange')}</Alert>}

      {eventsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : eventsQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void eventsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:audit.resultCount', { count: data?.totalElements ?? 0 })}
          </p>
          <DataTable
            caption={t('admin:audit.title')}
            columns={columns}
            rows={data?.content ?? []}
            rowKey={(event) => event.id}
            empty={
              <EmptyState title={t('admin:audit.empty')} description={t('admin:audit.emptyHint')} />
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
