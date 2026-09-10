import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as recruitmentApi from '../api/recruitmentApi'
import { NOMINATION_STATUS_TONE } from '../components/statusTone'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AnimatedCheck, Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../../components/ui'

/**
 * The student's nomination inbox and consent decision (CLAUDE.md section 35, Phase 4 section 25).
 *
 * <p>The copy states plainly that the organization sees nothing until the student accepts — consent
 * is the gate, and the student should understand that when deciding.
 */
export function MyNominationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [acceptedId, setAcceptedId] = useState<string | null>(null)

  const nominationsQuery = useQuery({
    queryKey: ['recruitment', 'my-nominations'],
    queryFn: recruitmentApi.listMyNominations,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'my-nominations'] })
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'my-candidacies'] })
  }

  const acceptMutation = useMutation({
    mutationFn: (nominationId: string) => recruitmentApi.acceptNomination(nominationId),
    onSuccess: (_data, nominationId) => {
      setAcceptedId(nominationId)
      invalidate()
    },
  })

  const declineMutation = useMutation({
    mutationFn: (nominationId: string) => recruitmentApi.declineNomination(nominationId),
    onSuccess: invalidate,
  })

  if (nominationsQuery.isLoading) {
    return <LoadingState label={t('common:status.loading')} />
  }

  if (nominationsQuery.isError) {
    return (
      <ErrorState
        title={t('common:status.error')}
        onRetry={() => void nominationsQuery.refetch()}
        retryLabel={t('common:actions.retry')}
      />
    )
  }

  const nominations = nominationsQuery.data ?? []
  const pending = nominations.filter((nomination) => nomination.status === 'PENDING_STUDENT_CONSENT')
  const resolved = nominations.filter((nomination) => nomination.status !== 'PENDING_STUDENT_CONSENT')
  const responsePending = acceptMutation.isPending || declineMutation.isPending
  const responseError = acceptMutation.error ?? declineMutation.error ?? null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('recruitment:nominations.title')} />

      {nominations.length === 0 && (
        <EmptyState className="mt-8" title={t('recruitment:nominations.empty')} />
      )}

      {pending.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-foreground">{t('recruitment:nominations.needsConsent')}</h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('recruitment:nominations.consentExplainer')}</p>

          <ul className="mt-4 flex flex-col gap-3">
            {pending.map((nomination) => (
              <li key={nomination.id} className="rounded-lg border border-warning bg-warning-bg p-4">
                <p className="font-medium text-foreground">{nomination.opportunityTitle}</p>
                {nomination.organizationName && (
                  <p className="text-sm text-foreground-secondary">{nomination.organizationName}</p>
                )}
                {nomination.note && <p className="mt-2 text-sm text-foreground-secondary">{nomination.note}</p>}

                {acceptedId === nomination.id ? (
                  <div className="mt-4 flex justify-center">
                    <AnimatedCheck label={t('recruitment:nominations.acceptedTitle')} />
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      loading={acceptMutation.isPending && acceptMutation.variables === nomination.id}
                      disabled={responsePending}
                      onClick={() => acceptMutation.mutate(nomination.id)}
                    >
                      {t('recruitment:nominations.accept')}
                    </Button>
                    <Button
                      variant="outline"
                      loading={declineMutation.isPending && declineMutation.variables === nomination.id}
                      disabled={responsePending}
                      onClick={() => declineMutation.mutate(nomination.id)}
                    >
                      {t('recruitment:nominations.decline')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {responseError && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'recruitment', 'nominations', responseError)}
            </p>
          )}
        </section>
      )}

      {resolved.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">{t('recruitment:nominations.history')}</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {resolved.map((nomination) => (
              <li
                key={nomination.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium text-foreground">{nomination.opportunityTitle}</p>
                  {nomination.organizationName && (
                    <p className="text-sm text-foreground-secondary">{nomination.organizationName}</p>
                  )}
                </div>
                <StatusBadge tone={NOMINATION_STATUS_TONE[nomination.status]}>
                  {t(`recruitment:nominationStatusValues.${nomination.status}`)}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
