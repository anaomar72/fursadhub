import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, FormField, LoadingSpinner, Pagination, Select, StatusBadge, Textarea } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import type { PrivacyRequestState } from '../../privacy/types'
import * as adminApi from '../api/adminApi'

const STATE_TONE: Record<PrivacyRequestState, StatusTone> = {
  SUBMITTED: 'info',
  IN_REVIEW: 'warning',
  COMPLETED: 'success',
  REJECTED: 'danger',
}

const FILTER_STATES: PrivacyRequestState[] = ['SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED']

/**
 * The data-subject request queue (CLAUDE.md section 50).
 *
 * <p>Processing is MANUAL for the pilot: an administrator does the work outside the system and
 * records what was done. Nothing on this page deletes or exports anything on its own — an automated
 * ERASURE would happily destroy records tied to a live placement or an open verification case.
 */
export function AdminPrivacyRequestsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [state, setState] = useState<PrivacyRequestState | ''>('SUBMITTED')
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<{ id: string; action: 'complete' | 'reject' } | null>(null)
  const [note, setNote] = useState('')

  const requestsQuery = useQuery({
    queryKey: ['admin', 'privacy-requests', state, page],
    queryFn: () => adminApi.listPrivacyRequests({ state: state === '' ? undefined : state, page }),
  })

  const resolveMutation = useMutation({
    mutationFn: ({
      requestId,
      action,
      resolutionNote,
    }: {
      requestId: string
      action: 'begin-review' | 'complete' | 'reject'
      resolutionNote?: string
    }) => {
      setError(null)
      return adminApi.resolvePrivacyRequest(requestId, action, resolutionNote).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'privacyRequests', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setResolving(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'privacy-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{t('admin:privacyRequests.title')}</h1>
        <p className="mt-1 text-sm text-foreground-secondary">{t('admin:privacyRequests.description')}</p>
      </div>

      <FormField label={t('admin:privacyRequests.stateFilter')} htmlFor="privacy-state" className="w-56">
        <Select
          id="privacy-state"
          value={state}
          onChange={(event) => {
            setState(event.target.value as PrivacyRequestState | '')
            setPage(0)
          }}
        >
          <option value="">{t('admin:privacyRequests.allStates')}</option>
          {FILTER_STATES.map((value) => (
            <option key={value} value={value}>
              {t(`privacy:requestStates.${value}`)}
            </option>
          ))}
        </Select>
      </FormField>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {requestsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (requestsQuery.data?.content ?? []).length === 0 ? (
        <p className="text-sm text-foreground-secondary">{t('admin:privacyRequests.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requestsQuery.data!.content.map((request) => (
            <li key={request.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-foreground">
                    {t(`privacy:requestTypes.${request.requestType}`)}
                  </h2>
                  <p className="text-xs text-foreground-secondary">
                    {t('admin:privacyRequests.submittedAt', {
                      date: new Date(request.submittedAt).toLocaleString(),
                    })}
                  </p>
                </div>
                <StatusBadge tone={STATE_TONE[request.state]}>
                  {t(`privacy:requestStates.${request.state}`)}
                </StatusBadge>
              </div>

              {request.details && <p className="text-sm text-foreground">{request.details}</p>}

              {request.resolutionNote && (
                <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground">
                  <span className="font-medium">{t('admin:privacyRequests.outcome')}: </span>
                  {request.resolutionNote}
                </p>
              )}

              {resolving?.id === request.id ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    resolveMutation.mutate({
                      requestId: request.id,
                      action: resolving.action,
                      resolutionNote: note,
                    })
                  }}
                >
                  <FormField
                    label={t(`admin:privacyRequests.actions.${resolving.action}`)}
                    htmlFor={`privacy-note-${request.id}`}
                  >
                    <Textarea
                      id={`privacy-note-${request.id}`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      maxLength={4000}
                      placeholder={t('admin:privacyRequests.notePlaceholder')}
                    />
                  </FormField>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={resolveMutation.isPending}>
                      {t('admin:privacyRequests.confirm')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setResolving(null)}>
                      {t('admin:privacyRequests.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                request.state !== 'COMPLETED' &&
                request.state !== 'REJECTED' && (
                  <div className="flex flex-wrap gap-2">
                    {request.state === 'SUBMITTED' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          resolveMutation.mutate({ requestId: request.id, action: 'begin-review' })
                        }
                        disabled={resolveMutation.isPending}
                      >
                        {t('admin:privacyRequests.actions.begin-review')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setResolving({ id: request.id, action: 'complete' })
                        setNote('')
                      }}
                      disabled={resolveMutation.isPending}
                    >
                      {t('admin:privacyRequests.actions.complete')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResolving({ id: request.id, action: 'reject' })
                        setNote('')
                      }}
                      disabled={resolveMutation.isPending}
                    >
                      {t('admin:privacyRequests.actions.reject')}
                    </Button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {(requestsQuery.data?.totalPages ?? 0) > 1 && (
        <Pagination page={page} totalPages={requestsQuery.data!.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
