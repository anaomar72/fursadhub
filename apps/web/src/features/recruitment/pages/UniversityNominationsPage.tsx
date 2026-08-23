import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as recruitmentApi from '../api/recruitmentApi'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { NOMINATION_STATUS_TONE } from '../components/statusTone'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, LoadingSpinner, StatusBadge } from '../../../components/ui'

/**
 * Nomination list and withdrawal for university staff (CLAUDE.md Phase 4 section 26).
 *
 * <p>A department coordinator sees only nominations within their assigned departments — that
 * scoping is applied by the backend, not here.
 */
export function UniversityNominationsPage() {
  const { t } = useTranslation()
  const membership = useUniversityMembership()
  const queryClient = useQueryClient()

  const nominationsQuery = useQuery({
    queryKey: ['recruitment', 'university-nominations', membership.universityId],
    queryFn: () => recruitmentApi.listUniversityNominations(membership.universityId),
  })

  const withdrawMutation = useMutation({
    mutationFn: (nominationId: string) =>
      recruitmentApi.withdrawNomination(membership.universityId, nominationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'university-nominations'] })
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'target-requests'] })
    },
  })

  if (nominationsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const nominations = nominationsQuery.data ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('recruitment:universityNominations.title')}</h1>

      {nominations.length === 0 ? (
        <p className="mt-8 text-center text-sm text-foreground-secondary">
          {t('recruitment:universityNominations.empty')}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {nominations.map((nomination) => (
            <li key={nomination.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {nomination.studentFullName ?? nomination.studentEmail ?? nomination.studentUserId}
                  </p>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {nomination.opportunityTitle}
                    {nomination.organizationName ? ` · ${nomination.organizationName}` : ''}
                  </p>
                </div>
                <StatusBadge tone={NOMINATION_STATUS_TONE[nomination.status]}>
                  {t(`recruitment:nominationStatusValues.${nomination.status}`)}
                </StatusBadge>
              </div>

              {nomination.status === 'PENDING_STUDENT_CONSENT' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  loading={withdrawMutation.isPending && withdrawMutation.variables === nomination.id}
                  disabled={withdrawMutation.isPending}
                  onClick={() => withdrawMutation.mutate(nomination.id)}
                >
                  {t('recruitment:universityNominations.withdraw')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {withdrawMutation.isError && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {apiErrorMessage(t, 'recruitment', 'universityNominations', withdrawMutation.error)}
        </p>
      )}
    </div>
  )
}
