import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, FormField, Input, LoadingSpinner, Pagination, PageHeader, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import type { AdminUniversity, InstitutionVerificationStatus } from '../types'

const STATUS_TONE: Record<InstitutionVerificationStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_CHANGES: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'warning',
  REVOKED: 'danger',
}

const FILTER_STATUSES: InstitutionVerificationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_CHANGES',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED',
  'REVOKED',
]

/**
 * Which commands are offered from each state — the counterpart of the same map on
 * AdminOrganizationsPage.tsx. A convenience only: the frozen state machine lives on the backend's
 * {@code University} entity and refuses anything invalid regardless of what this map says.
 */
const ACTIONS: Record<InstitutionVerificationStatus, Array<'begin-review' | 'verify' | 'request-changes' | 'reject' | 'suspend' | 'revoke'>> = {
  DRAFT: [],
  SUBMITTED: ['begin-review', 'verify', 'reject'],
  UNDER_REVIEW: ['verify', 'request-changes', 'reject'],
  NEEDS_CHANGES: [],
  VERIFIED: ['suspend', 'revoke'],
  REJECTED: [],
  SUSPENDED: ['revoke'],
  REVOKED: [],
}

const NEEDS_NOTE = new Set(['request-changes', 'reject', 'suspend', 'revoke'])

/** Platform review of university verification — the counterpart of AdminOrganizationsPage.tsx. */
export function AdminUniversitiesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<InstitutionVerificationStatus | ''>('SUBMITTED')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<{ id: string; action: string } | null>(null)
  const [note, setNote] = useState('')

  const universitiesQuery = useQuery({
    queryKey: ['admin', 'universities', status, query, page],
    queryFn: () =>
      adminApi.listUniversities({
        status: status === '' ? undefined : status,
        query: query || undefined,
        page,
      }),
  })

  const downloadMutation = useMutation({
    mutationFn: async (universityId: string) => {
      setError(null)
      const blob = await adminApi.downloadUniversityEvidence(universityId).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'universities', cause))
        throw cause
      })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = 'university-license'
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    },
  })

  const transitionMutation = useMutation({
    mutationFn: ({
      universityId,
      action,
      reviewNote,
    }: {
      universityId: string
      action: 'begin-review' | 'verify' | 'request-changes' | 'reject' | 'suspend' | 'revoke'
      reviewNote?: string
    }) => {
      setError(null)
      return adminApi.universityTransition(universityId, action, reviewNote).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'universities', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setNoteFor(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'universities'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  function runAction(university: AdminUniversity, action: string) {
    if (NEEDS_NOTE.has(action)) {
      setNoteFor({ id: university.id, action })
      setNote('')
      return
    }
    transitionMutation.mutate({ universityId: university.id, action: action as never })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('admin:universities.title')} />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(0)
        }}
      >
        <FormField label={t('admin:universities.statusFilter')} htmlFor="uni-status" className="w-48">
          <Select
            id="uni-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as InstitutionVerificationStatus | '')
              setPage(0)
            }}
          >
            <option value="">{t('admin:universities.allStatuses')}</option>
            {FILTER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:statusLabels.${value}`)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('admin:universities.searchLabel')} htmlFor="uni-query" className="w-64">
          <Input
            id="uni-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin:universities.searchPlaceholder')}
          />
        </FormField>

        <Button type="submit" variant="outline">
          {t('admin:universities.search')}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {universitiesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (universitiesQuery.data?.content ?? []).length === 0 ? (
        <EmptyState title={t('admin:universities.empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {universitiesQuery.data!.content.map((university) => (
            <li key={university.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-foreground">{university.name}</h2>
                  <p className="text-xs text-foreground-secondary">
                    {university.city ?? ''}
                    {university.registrationNumber ? ` · ${university.registrationNumber}` : ''}
                  </p>
                </div>
                <StatusBadge tone={STATUS_TONE[university.verificationStatus]}>
                  {t(`admin:statusLabels.${university.verificationStatus}`)}
                </StatusBadge>
              </div>

              {noteFor?.id === university.id ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    transitionMutation.mutate({
                      universityId: university.id,
                      action: noteFor.action as never,
                      reviewNote: note,
                    })
                  }}
                >
                  <FormField
                    label={t(`admin:universities.actions.${noteFor.action}`)}
                    htmlFor={`note-${university.id}`}
                  >
                    <Input
                      id={`note-${university.id}`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t('admin:universities.notePlaceholder')}
                      maxLength={2000}
                    />
                  </FormField>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={transitionMutation.isPending}>
                      {t('admin:universities.confirm')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setNoteFor(null)}>
                      {t('admin:universities.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {university.hasEvidence && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={downloadMutation.isPending && downloadMutation.variables === university.id}
                      onClick={() => downloadMutation.mutate(university.id)}
                    >
                      {t('admin:universities.viewLicense')}
                    </Button>
                  )}
                  {ACTIONS[university.verificationStatus].map((action) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant={action === 'verify' ? 'primary' : 'outline'}
                      onClick={() => runAction(university, action)}
                      disabled={transitionMutation.isPending}
                    >
                      {t(`admin:universities.actions.${action}`)}
                    </Button>
                  ))}
                  {ACTIONS[university.verificationStatus].length === 0 && (
                    <p className="text-xs text-foreground-secondary">
                      {t('admin:universities.noActions')}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {(universitiesQuery.data?.totalPages ?? 0) > 1 && (
        <Pagination page={page} totalPages={universitiesQuery.data!.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
