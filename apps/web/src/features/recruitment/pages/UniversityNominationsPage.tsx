import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { universityQueries } from '../../university/universityQueries'
import { NominationWorkflowNote } from '../components/NominationWorkflowNote'
import { NOMINATION_STATUS_TONE } from '../components/statusTone'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Alert, Button, ConfirmationDialog, EmptyState, ErrorState, FilterBar, PageHeader, SearchInput, Select, SkeletonList, StatusBadge } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import type { NominationResponse, NominationStatus } from '../types'

const STATUSES: NominationStatus[] = ['PENDING_STUDENT_CONSENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN']

/**
 * The university's nominations (CLAUDE.md section 35), Phase 7.
 *
 * <p>Each row says whose move it is next, in the backend's own terms: a nomination waits on the
 * student's consent; ACCEPTED means the student agreed to be considered and is now a candidate in
 * the organization's pipeline — not that they were offered or placed; DECLINED and WITHDRAWN are
 * closed. Only a nomination still awaiting consent can be withdrawn
 * ({@code Nomination.withdraw → requirePending}), and withdrawing is confirmed first because the
 * student loses the invitation. A coordinator sees only their departments' nominations — scoped by
 * the backend, not here.
 */
export function UniversityNominationsPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const status = (STATUSES as string[]).includes(params.get('status') ?? '') ? (params.get('status') as NominationStatus) : ''
  const [search, setSearch] = useState('')
  const [withdrawing, setWithdrawing] = useState<NominationResponse | null>(null)

  const nominationsQuery = useQuery(universityQueries.nominations(universityId))
  const departmentsQuery = useQuery(universityQueries.departments(universityId))
  const departmentNames = new Map((departmentsQuery.data ?? []).map((department) => [department.id, department.name]))

  const withdrawMutation = useMutation({
    mutationFn: (nominationId: string) => recruitmentApi.withdrawNomination(universityId, nominationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recruitment', 'university-nominations'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment', 'target-requests'] })
    },
    onSettled: () => setWithdrawing(null),
  })

  const term = search.trim().toLowerCase()
  const rows = [...(nominationsQuery.data ?? [])]
    .filter((nomination) => !status || nomination.status === status)
    .filter((nomination) =>
      !term
        ? true
        : [nomination.studentFullName, nomination.studentEmail, nomination.opportunityTitle, nomination.organizationName].some((value) =>
            value?.toLowerCase().includes(term),
          ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('recruitment:universityNominations.title')} description={t('recruitment:universityNominations.subtitle')} />

      <NominationWorkflowNote />

      <FilterBar
        search={
          <SearchInput
            label={t('recruitment:universityNominations.searchLabel')}
            placeholder={t('recruitment:universityNominations.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        <Select
          aria-label={t('recruitment:universityNominations.statusLabel')}
          className="sm:w-56"
          value={status}
          onChange={(event) => setParams(event.target.value ? { status: event.target.value } : {}, { replace: true })}
        >
          <option value="">{t('recruitment:universityNominations.allStatuses')}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`recruitment:nominationStatusValues.${value}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {withdrawMutation.isError && <Alert tone="danger">{apiErrorMessage(t, 'recruitment', 'universityNominations', withdrawMutation.error)}</Alert>}

      {nominationsQuery.isLoading ? (
        <SkeletonList rows={4} />
      ) : nominationsQuery.isError ? (
        <ErrorState onRetry={() => void nominationsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t(status || term ? 'recruitment:universityNominations.noMatches' : 'recruitment:universityNominations.empty')}
          description={status || term ? undefined : t('recruitment:universityNominations.emptyHint')}
        />
      ) : (
        <>
          <p className="text-body text-foreground-secondary" aria-live="polite">
            {t('recruitment:universityNominations.resultCount', { count: rows.length })}
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {rows.map((nomination) => {
              const name = nomination.studentFullName ?? nomination.studentEmail ?? t('recruitment:universityNominations.unknownStudent')
              return (
                <li key={nomination.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-body font-semibold text-foreground">{name}</p>
                    <p className="mt-0.5 break-words text-caption text-foreground-secondary">
                      {[nomination.opportunityTitle, nomination.organizationName, departmentNames.get(nomination.departmentId)].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-caption text-foreground-secondary">
                      {t('recruitment:universityNominations.nominatedOn', { date: formatDate(nomination.createdAt) })}
                      {nomination.respondedAt && ` · ${t('recruitment:universityNominations.respondedOn', { date: formatDate(nomination.respondedAt) })}`}
                    </p>
                    <p className="mt-1.5 text-caption text-foreground">{t(`recruitment:universityNominations.next.${nomination.status}`)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                    <StatusBadge tone={NOMINATION_STATUS_TONE[nomination.status]}>{t(`recruitment:nominationStatusValues.${nomination.status}`)}</StatusBadge>
                    {nomination.status === 'PENDING_STUDENT_CONSENT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={t('recruitment:universityNominations.withdrawNamed', { name })}
                        disabled={withdrawMutation.isPending}
                        onClick={() => setWithdrawing(nomination)}
                      >
                        {t('recruitment:universityNominations.withdraw')}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <ConfirmationDialog
        open={withdrawing !== null}
        onClose={() => setWithdrawing(null)}
        destructive
        loading={withdrawMutation.isPending}
        title={t('recruitment:universityNominations.confirmWithdraw.title')}
        description={t('recruitment:universityNominations.confirmWithdraw.body', {
          name: withdrawing?.studentFullName ?? withdrawing?.studentEmail ?? '',
          opportunity: withdrawing?.opportunityTitle ?? '',
        })}
        confirmLabel={t('recruitment:universityNominations.withdraw')}
        cancelLabel={t('recruitment:universityNominations.confirmWithdraw.keep')}
        onConfirm={() => withdrawing && withdrawMutation.mutate(withdrawing.id)}
      />
    </PageContainer>
  )
}
