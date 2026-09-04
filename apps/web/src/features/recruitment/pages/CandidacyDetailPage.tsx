import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { CANDIDACY_STATUS_TONE, OFFER_STATUS_TONE } from '../components/statusTone'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  AnimatedCheck,
  Button,
  Card,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

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
    queryKey: ['student', 'candidacy', candidacyId],
    queryFn: () => recruitmentApi.getMyCandidacy(candidacyId!),
    enabled: !!candidacyId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['student', 'candidacy', candidacyId] })
    queryClient.invalidateQueries({ queryKey: ['student', 'candidacies'] })
    // Accepting an offer creates the placement, which changes the student's availability everywhere.
    queryClient.invalidateQueries({ queryKey: ['student', 'placements'] })
    queryClient.invalidateQueries({ queryKey: ['student', 'offers'] })
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
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const candidacy = candidacyQuery.data
  if (!candidacy) {
    return (
      <PageContainer>
        <ErrorState title={t('recruitment:detail.notFound')} />
      </PageContainer>
    )
  }

  const offer = candidacy.liveOffer
  const responsePending = acceptMutation.isPending || declineMutation.isPending
  const responseError = acceptMutation.error ?? declineMutation.error ?? null
  const acceptedPlacementId = acceptMutation.data?.placement.id ?? null

  return (
    <PageContainer width="narrow" className="flex flex-col gap-6">
      <div>
        <Link
          to="/student/applications"
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground-secondary hover:text-foreground"
        >
          <Icon name="chevronLeft" className="size-4" />
          {t('recruitment:applications.title')}
        </Link>
      </div>

      <PageHeader
        title={candidacy.opportunityTitle}
        description={`${t(`recruitment:sourceValues.${candidacy.source}`)} · ${t('recruitment:applications.appliedOn', { date: formatDate(candidacy.createdAt) })}`}
        actions={
          <StatusBadge tone={CANDIDACY_STATUS_TONE[candidacy.status]}>
            {t(`recruitment:candidacyStatusValues.${candidacy.status}`)}
          </StatusBadge>
        }
      />

      {/* One-time confirmation that the placement now exists, then a stable state. */}
      {acceptMutation.isSuccess && (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-3 text-center">
            <AnimatedCheck label={t('recruitment:detail.offerAcceptedTitle')} />
            <p className="text-sm text-foreground-secondary">{t('recruitment:detail.placementCreated')}</p>
            {acceptedPlacementId && (
              <Link
                to={`/student/placements/${acceptedPlacementId}`}
                className="inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-blue-strong motion-reduce:transition-none"
              >
                {t('student:dashboard.openPlacement')}
              </Link>
            )}
          </div>
        </Card>
      )}

      {offer && !acceptMutation.isSuccess && (
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
              {t('recruitment:detail.offerTitle')}
            </h2>
            <StatusBadge tone={OFFER_STATUS_TONE[offer.status]}>
              {t(`recruitment:offerStatusValues.${offer.status}`)}
            </StatusBadge>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
            <Row label={t('recruitment:detail.startDate')} value={formatDate(offer.startDate)} />
            <Row label={t('recruitment:detail.endDate')} value={formatDate(offer.endDate)} />
            <Row label={t('recruitment:detail.responseDeadline')} value={formatDate(offer.responseDeadline)} />
            {offer.location && <Row label={t('recruitment:detail.location')} value={offer.location} />}
          </dl>

          {offer.details && (
            <p className="mt-4 whitespace-pre-line rounded-md bg-surface-muted p-3 text-sm text-foreground-secondary">
              {offer.details}
            </p>
          )}

          {offer.status === 'PENDING' && (
            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
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
        </Card>
      )}

      {canWithdraw(candidacy.status) && (
        <Card padding="lg">
          <h2 className="text-sm font-bold text-foreground">{t('recruitment:detail.withdrawTitle')}</h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('recruitment:detail.withdrawHint')}</p>
          <Button
            variant="outline"
            loading={withdrawMutation.isPending}
            onClick={() => withdrawMutation.mutate()}
            className="mt-4 w-full sm:w-auto"
          >
            {t('recruitment:detail.withdraw')}
          </Button>
          {withdrawMutation.isError && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'recruitment', 'detail', withdrawMutation.error)}
            </p>
          )}
        </Card>
      )}
    </PageContainer>
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
    <div>
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
    </div>
  )
}
