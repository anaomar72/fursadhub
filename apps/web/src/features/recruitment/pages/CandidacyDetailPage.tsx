import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { CANDIDACY_STATUS_TONE, OFFER_STATUS_TONE } from '../components/statusTone'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AnimatedCheck, Button, LoadingSpinner, StatusBadge } from '../../../components/ui'

/**
 * A student's own candidacy, including any live offer and the accept/decline decision
 * (CLAUDE.md Phase 4 section 25).
 *
 * <p>Accepting is the moment a placement is created, so the confirmation says so explicitly. Both
 * buttons disable while either request is in flight, which — together with the backend's
 * idempotent acceptance — makes double-clicking harmless.
 */
export function CandidacyDetailPage() {
  const { t } = useTranslation()
  const { candidacyId } = useParams<{ candidacyId: string }>()
  const queryClient = useQueryClient()

  const candidacyQuery = useQuery({
    queryKey: ['recruitment', 'my-candidacy', candidacyId],
    queryFn: () => recruitmentApi.getMyCandidacy(candidacyId!),
    enabled: !!candidacyId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'my-candidacy', candidacyId] })
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'my-candidacies'] })
  }

  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => recruitmentApi.acceptOffer(offerId),
    onSuccess: invalidate,
  })
  const declineMutation = useMutation({
    mutationFn: (offerId: string) => recruitmentApi.declineOffer(offerId),
    onSuccess: invalidate,
  })
  const withdrawMutation = useMutation({
    mutationFn: () => recruitmentApi.withdrawCandidacy(candidacyId!),
    onSuccess: invalidate,
  })

  if (candidacyQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const candidacy = candidacyQuery.data
  if (!candidacy) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('recruitment:detail.notFound')}
      </p>
    )
  }

  const offer = candidacy.liveOffer
  const responsePending = acceptMutation.isPending || declineMutation.isPending
  const responseError = acceptMutation.error ?? declineMutation.error ?? null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{candidacy.opportunityTitle}</h1>
        <StatusBadge tone={CANDIDACY_STATUS_TONE[candidacy.status]}>
          {t(`recruitment:candidacyStatusValues.${candidacy.status}`)}
        </StatusBadge>
      </div>

      <p className="mt-1 text-sm text-foreground-secondary">
        {t(`recruitment:sourceValues.${candidacy.source}`)}
      </p>

      {/* One-time confirmation that the placement now exists, then a stable state. */}
      {acceptMutation.isSuccess && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <AnimatedCheck label={t('recruitment:detail.offerAcceptedTitle')} />
          <p className="text-sm text-foreground-secondary">{t('recruitment:detail.placementCreated')}</p>
        </div>
      )}

      {offer && !acceptMutation.isSuccess && (
        <section className="mt-6 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">{t('recruitment:detail.offerTitle')}</h2>
            <StatusBadge tone={OFFER_STATUS_TONE[offer.status]}>
              {t(`recruitment:offerStatusValues.${offer.status}`)}
            </StatusBadge>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
            <Row label={t('recruitment:detail.startDate')} value={offer.startDate} />
            <Row label={t('recruitment:detail.endDate')} value={offer.endDate} />
            <Row label={t('recruitment:detail.responseDeadline')} value={offer.responseDeadline} />
            {offer.location && <Row label={t('recruitment:detail.location')} value={offer.location} />}
          </dl>

          {offer.details && <p className="mt-3 text-sm text-foreground-secondary">{offer.details}</p>}

          {offer.status === 'PENDING' && (
            <div className="mt-5 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  loading={acceptMutation.isPending}
                  disabled={responsePending}
                  onClick={() => acceptMutation.mutate(offer.id)}
                >
                  {t('recruitment:detail.acceptOffer')}
                </Button>
                <Button
                  variant="outline"
                  loading={declineMutation.isPending}
                  disabled={responsePending}
                  onClick={() => declineMutation.mutate(offer.id)}
                >
                  {t('recruitment:detail.declineOffer')}
                </Button>
              </div>
              {responseError && (
                <p className="text-sm text-danger" role="alert">
                  {apiErrorMessage(t, 'recruitment', 'detail', responseError)}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {canWithdraw(candidacy.status) && (
        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="outline"
            loading={withdrawMutation.isPending}
            onClick={() => withdrawMutation.mutate()}
            className="w-full sm:w-auto"
          >
            {t('recruitment:detail.withdraw')}
          </Button>
          {withdrawMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'recruitment', 'detail', withdrawMutation.error)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * UX only — mirrors the backend's terminal states so a doomed button is not offered. The backend
 * remains the authority on whether a withdrawal is actually permitted.
 */
function canWithdraw(status: string): boolean {
  return !['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'OFFER_DECLINED', 'OFFER_EXPIRED'].includes(status)
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
