import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  FilterBar,
  FormField,
  LoadingState,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Textarea,
  type DataTableColumn,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import { DetailField } from '../components/DetailField'
import { PRIVACY_REQUEST_TONE } from '../statusTone'
import { formatDateTime } from '../../../lib/utils/formatDate'
import type { PrivacyRequest, PrivacyRequestState } from '../../privacy/types'

type PrivacyAction = 'begin-review' | 'complete' | 'reject'

/** Rejecting a data-subject request must say why; the other two need no explanation. */
const NEEDS_NOTE = new Set<PrivacyAction>(['reject'])

const FILTER_STATES: PrivacyRequestState[] = ['SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED']

/**
 * Which commands each state offers.
 *
 * <p>The frozen machine of CLAUDE.md section 50 lives on the backend and refuses anything invalid
 * regardless of what this map renders — {@code COMPLETED} and {@code REJECTED} are terminal.
 */
const ACTIONS: Record<PrivacyRequestState, PrivacyAction[]> = {
  SUBMITTED: ['begin-review', 'complete', 'reject'],
  IN_REVIEW: ['complete', 'reject'],
  COMPLETED: [],
  REJECTED: [],
}

/**
 * Data-subject requests (CLAUDE.md sections 49-50).
 *
 * <p>Manual admin processing is what the pilot calls for: the platform records the request and its
 * outcome, and a person does the work. There is deliberately no "export this person's data" button
 * here, because no endpoint behind one exists — inventing it would promise an automated erasure or
 * portability run that FursadHub does not perform.
 */
export function AdminPrivacyRequestsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [state, setState] = useState<PrivacyRequestState | ''>('SUBMITTED')
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [prompting, setPrompting] = useState<PrivacyAction | null>(null)
  const [note, setNote] = useState('')

  const requestsQuery = useQuery({
    queryKey: ['admin', 'privacy-requests', state, page],
    queryFn: () => adminApi.listPrivacyRequests({ state: state === '' ? undefined : state, page }),
  })

  const requests = requestsQuery.data?.content ?? []
  const openRequest = requests.find((request) => request.id === openId) ?? null

  const resolveMutation = useMutation({
    mutationFn: ({
      requestId,
      action,
      resolutionNote,
    }: {
      requestId: string
      action: PrivacyAction
      resolutionNote?: string
    }) => {
      setError(null)
      return adminApi.resolvePrivacyRequest(requestId, action, resolutionNote).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'privacyRequests', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setPrompting(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'privacy-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  const columns: DataTableColumn<PrivacyRequest>[] = [
    {
      key: 'type',
      header: t('admin:privacyRequests.requestType'),
      render: (request) => (
        <span className="font-medium text-foreground">
          {t(`privacy:requestTypes.${request.requestType}`)}
        </span>
      ),
    },
    {
      key: 'state',
      header: t('admin:privacyRequests.stateFilter'),
      render: (request) => (
        <StatusBadge tone={PRIVACY_REQUEST_TONE[request.state]}>
          {t(`privacy:requestStates.${request.state}`)}
        </StatusBadge>
      ),
    },
    {
      key: 'submittedAt',
      header: t('admin:privacyRequests.submittedAt'),
      className: 'whitespace-nowrap',
      render: (request) => (
        <span className="text-foreground-secondary">{formatDateTime(request.submittedAt)}</span>
      ),
    },
    {
      key: 'reviewedAt',
      header: t('admin:privacyRequests.reviewedAt'),
      className: 'whitespace-nowrap',
      render: (request) => (
        <span className="text-foreground-secondary">
          {request.reviewedAt ? formatDateTime(request.reviewedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'open',
      header: <span className="sr-only">{t('admin:privacyRequests.open')}</span>,
      render: (request) => (
        <Button size="sm" variant="outline" onClick={() => setOpenId(request.id)}>
          {t('admin:privacyRequests.open')}
        </Button>
      ),
    },
  ]

  const data = requestsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:privacyRequests.title')}
        description={t('admin:privacyRequests.description')}
      />

      {error && !openRequest && <Alert tone="danger">{error}</Alert>}

      <FilterBar>
        <Select
          aria-label={t('admin:privacyRequests.stateFilter')}
          className="sm:w-56"
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
      </FilterBar>

      {requestsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : requestsQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void requestsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:privacyRequests.resultCount', { count: data?.totalElements ?? 0 })}
          </p>
          <DataTable
            caption={t('admin:privacyRequests.title')}
            columns={columns}
            rows={requests}
            rowKey={(request) => request.id}
            empty={<EmptyState title={t('admin:privacyRequests.empty')} />}
          />
          {(data?.totalPages ?? 0) > 1 && (
            <Pagination page={page} totalPages={data!.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Drawer
        open={openRequest !== null}
        onClose={() => {
          setOpenId(null)
          setPrompting(null)
        }}
        closeLabel={t('common:actions.close')}
        title={t('admin:privacyRequests.open')}
      >
        {openRequest && (
          <div className="flex flex-col gap-4">
            {error && <Alert tone="danger">{error}</Alert>}

            <Card padding="md">
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label={t('admin:privacyRequests.requestType')}>
                  {t(`privacy:requestTypes.${openRequest.requestType}`)}
                </DetailField>
                <DetailField label={t('admin:privacyRequests.stateFilter')}>
                  <StatusBadge tone={PRIVACY_REQUEST_TONE[openRequest.state]}>
                    {t(`privacy:requestStates.${openRequest.state}`)}
                  </StatusBadge>
                </DetailField>
                <DetailField label={t('admin:privacyRequests.submittedAt')}>
                  {formatDateTime(openRequest.submittedAt)}
                </DetailField>
                <DetailField label={t('admin:privacyRequests.reviewedAt')}>
                  {openRequest.reviewedAt ? formatDateTime(openRequest.reviewedAt) : '—'}
                </DetailField>
              </dl>
            </Card>

            {openRequest.details && (
              <Card padding="md">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('admin:privacyRequests.details')}
                </h3>
                <p className="mt-1 text-sm text-foreground-secondary">{openRequest.details}</p>
              </Card>
            )}

            {openRequest.resolutionNote && (
              <Card padding="md">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('admin:privacyRequests.outcome')}
                </h3>
                <p className="mt-1 text-sm text-foreground-secondary">{openRequest.resolutionNote}</p>
              </Card>
            )}

            {prompting ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  resolveMutation.mutate({
                    requestId: openRequest.id,
                    action: prompting,
                    resolutionNote: note,
                  })
                }}
              >
                <FormField
                  label={t(`admin:privacyRequests.actions.${prompting}`)}
                  htmlFor="privacy-note"
                  hint={t('admin:privacyRequests.noteHint')}
                >
                  <Textarea
                    id="privacy-note"
                    rows={3}
                    maxLength={2000}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t('admin:privacyRequests.notePlaceholder')}
                  />
                </FormField>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="danger" loading={resolveMutation.isPending}>
                    {t('common:actions.confirm')}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPrompting(null)}>
                    {t('common:actions.cancel')}
                  </Button>
                </div>
              </form>
            ) : ACTIONS[openRequest.state].length === 0 ? (
              <p className="text-sm text-muted">{t('admin:privacyRequests.noActions')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ACTIONS[openRequest.state].map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action === 'reject' ? 'danger' : action === 'complete' ? 'primary' : 'outline'}
                    disabled={resolveMutation.isPending}
                    onClick={() => {
                      if (NEEDS_NOTE.has(action)) {
                        setNote('')
                        setPrompting(action)
                        return
                      }
                      resolveMutation.mutate({ requestId: openRequest.id, action })
                    }}
                  >
                    {t(`admin:privacyRequests.actions.${action}`)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
