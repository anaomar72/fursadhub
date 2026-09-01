import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { EmptyState, FormField, LoadingSpinner, Pagination, PageHeader, Select } from '../../../components/ui'
import * as adminApi from '../api/adminApi'

/**
 * The audit trail (Phase 7 "Admin: audit viewing").
 *
 * <p>Read-only in the strongest sense: there is no control here to edit or delete an event, and no
 * endpoint behind one either. The trail is append-only (CLAUDE.md section 51) — one an administrator
 * could tidy up would be worthless exactly when it mattered.
 */
export function AdminAuditPage() {
  const { t } = useTranslation()
  const [eventType, setEventType] = useState('')
  const [page, setPage] = useState(0)

  const typesQuery = useQuery({
    queryKey: ['admin', 'audit-types'],
    queryFn: adminApi.listAuditEventTypes,
  })

  const eventsQuery = useQuery({
    queryKey: ['admin', 'audit', eventType, page],
    queryFn: () => adminApi.listAuditEvents({ eventType: eventType || undefined, page }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <PageHeader title={t('admin:audit.title')} />
        <p className="mt-1 text-sm text-foreground-secondary">{t('admin:audit.description')}</p>
      </div>

      <FormField label={t('admin:audit.typeFilter')} htmlFor="audit-type" className="w-72">
        <Select
          id="audit-type"
          value={eventType}
          onChange={(event) => {
            setEventType(event.target.value)
            setPage(0)
          }}
        >
          <option value="">{t('admin:audit.allTypes')}</option>
          {(typesQuery.data ?? []).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </FormField>

      {eventsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (eventsQuery.data?.content ?? []).length === 0 ? (
        <EmptyState title={t('admin:audit.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-border text-left text-foreground-secondary">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('admin:audit.occurredAt')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('admin:audit.eventType')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('admin:audit.actor')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('admin:audit.metadata')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {eventsQuery.data!.content.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-foreground-secondary">
                    {new Date(event.occurredAt).toLocaleString()}
                  </td>
                  {/* Event types are stable machine codes, shown verbatim — an administrator
                      reading an audit trail needs the exact code, not a paraphrase. */}
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{event.eventType}</td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground-secondary">
                    {event.userId ?? t('admin:audit.system')}
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground-secondary">{event.metadata ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(eventsQuery.data?.totalPages ?? 0) > 1 && (
        <Pagination page={page} totalPages={eventsQuery.data!.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
