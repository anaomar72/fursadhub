import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Input, LoadingSpinner, Pagination, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import type { AdminOrganization, InstitutionVerificationStatus } from '../types'

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
 * Which commands are offered from each state.
 *
 * <p>A convenience only. The frozen state machine lives on the backend's {@code Organization} entity
 * and refuses anything invalid regardless of what this map says — hiding a button that would fail is
 * politeness, not enforcement (CLAUDE.md section 24).
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

/** Commands that must carry a reason the organization will be told about. */
const NEEDS_NOTE = new Set(['request-changes', 'reject', 'suspend', 'revoke'])

export function AdminOrganizationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<InstitutionVerificationStatus | ''>('SUBMITTED')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<{ id: string; action: string } | null>(null)
  const [note, setNote] = useState('')

  const organizationsQuery = useQuery({
    queryKey: ['admin', 'organizations', status, query, page],
    queryFn: () =>
      adminApi.listOrganizations({
        status: status === '' ? undefined : status,
        query: query || undefined,
        page,
      }),
  })

  const transitionMutation = useMutation({
    mutationFn: ({
      organizationId,
      action,
      reviewNote,
    }: {
      organizationId: string
      action: 'begin-review' | 'verify' | 'request-changes' | 'reject' | 'suspend' | 'revoke'
      reviewNote?: string
    }) => {
      setError(null)
      return adminApi.organizationTransition(organizationId, action, reviewNote).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'organizations', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setNoteFor(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  function runAction(organization: AdminOrganization, action: string) {
    if (NEEDS_NOTE.has(action)) {
      setNoteFor({ id: organization.id, action })
      setNote('')
      return
    }
    transitionMutation.mutate({ organizationId: organization.id, action: action as never })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('admin:organizations.title')}</h1>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(0)
        }}
      >
        <FormField label={t('admin:organizations.statusFilter')} htmlFor="org-status" className="w-48">
          <Select
            id="org-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as InstitutionVerificationStatus | '')
              setPage(0)
            }}
          >
            <option value="">{t('admin:organizations.allStatuses')}</option>
            {FILTER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:statusLabels.${value}`)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('admin:organizations.searchLabel')} htmlFor="org-query" className="w-64">
          <Input
            id="org-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin:organizations.searchPlaceholder')}
          />
        </FormField>

        <Button type="submit" variant="outline">
          {t('admin:organizations.search')}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {organizationsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (organizationsQuery.data?.content ?? []).length === 0 ? (
        <p className="text-sm text-foreground-secondary">{t('admin:organizations.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {organizationsQuery.data!.content.map((organization) => (
            <li key={organization.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-foreground">{organization.name}</h2>
                  <p className="text-xs text-foreground-secondary">
                    {t(`admin:organizationTypes.${organization.type}`, organization.type)}
                    {organization.registrationNumber ? ` · ${organization.registrationNumber}` : ''}
                  </p>
                </div>
                <StatusBadge tone={STATUS_TONE[organization.verificationStatus]}>
                  {t(`admin:statusLabels.${organization.verificationStatus}`)}
                </StatusBadge>
              </div>

              {noteFor?.id === organization.id ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    transitionMutation.mutate({
                      organizationId: organization.id,
                      action: noteFor.action as never,
                      reviewNote: note,
                    })
                  }}
                >
                  <FormField
                    label={t(`admin:organizations.actions.${noteFor.action}`)}
                    htmlFor={`note-${organization.id}`}
                  >
                    <Input
                      id={`note-${organization.id}`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t('admin:organizations.notePlaceholder')}
                      maxLength={2000}
                    />
                  </FormField>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={transitionMutation.isPending}>
                      {t('admin:organizations.confirm')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setNoteFor(null)}>
                      {t('admin:organizations.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ACTIONS[organization.verificationStatus].map((action) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant={action === 'verify' ? 'primary' : 'outline'}
                      onClick={() => runAction(organization, action)}
                      disabled={transitionMutation.isPending}
                    >
                      {t(`admin:organizations.actions.${action}`)}
                    </Button>
                  ))}
                  {ACTIONS[organization.verificationStatus].length === 0 && (
                    <p className="text-xs text-foreground-secondary">
                      {t('admin:organizations.noActions')}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {(organizationsQuery.data?.totalPages ?? 0) > 1 && (
        <Pagination page={page} totalPages={organizationsQuery.data!.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
