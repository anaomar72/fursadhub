import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { NOMINATION_STATUS_TONE } from '../../../lib/status/statusTones'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { formatDate } from '../../../lib/utils/formatDate'
import { studentQueries } from '../../student/studentQueries'
import { PageContainer } from '../../../app/layouts/PageContainer'
import type { StudentNominationResponse } from '../types'
import {
  Alert,
  AnimatedCheck,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  SectionHeading,
  SkeletonList,
  StatusBadge,
} from '../../../components/ui'

/**
 * The student's nomination inbox and consent decision (CLAUDE.md section 35, Phase 4 section 25).
 *
 * <p>The copy states plainly that the organization sees nothing until the student accepts — consent
 * is the gate, and the student should understand that when deciding. Nominations waiting for that
 * decision come first, each with everything needed to decide (the internship, the organization, the
 * university's note, when it arrived); answered ones follow as a quiet history, each with one
 * sentence on what the outcome means.
 *
 * <p>Reads and invalidates the shared student keys ({@link studentQueries}): accepting a nomination
 * creates or merges a candidacy, so the applications list and the dashboard refresh with it.
 */
export function MyNominationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [acceptedId, setAcceptedId] = useState<string | null>(null)

  const nominationsQuery = useQuery(studentQueries.nominations())

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: studentQueries.nominations().queryKey })
    void queryClient.invalidateQueries({ queryKey: studentQueries.candidacies().queryKey })
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

  const nominations = nominationsQuery.data ?? []
  const pending = nominations.filter((nomination) => nomination.status === 'PENDING_STUDENT_CONSENT')
  const resolved = nominations.filter((nomination) => nomination.status !== 'PENDING_STUDENT_CONSENT')
  const responsePending = acceptMutation.isPending || declineMutation.isPending
  const responseError = acceptMutation.error ?? declineMutation.error ?? null

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader title={t('recruitment:nominations.title')} description={t('recruitment:nominations.subtitle')} />

      {nominationsQuery.isLoading ? (
        <SkeletonList rows={3} />
      ) : nominationsQuery.isError ? (
        <ErrorState onRetry={() => void nominationsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : nominations.length === 0 ? (
        <EmptyState
          title={t('recruitment:nominations.empty')}
          description={t('recruitment:nominations.emptyHint')}
          action={
            <Link
              to="/student/opportunities"
              className="inline-flex h-10 items-center rounded-md bg-action-primary px-4 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('student:nav.exploreInternships')}
            </Link>
          }
        />
      ) : (
        <>
          {pending.length > 0 && (
            <section aria-labelledby="nominations-pending" className="flex flex-col gap-4">
              <SectionHeading id="nominations-pending" title={t('recruitment:nominations.needsConsent')} description={t('recruitment:nominations.consentExplainer')} />
              <ul className="flex flex-col gap-3">
                {pending.map((nomination) => (
                  <li key={nomination.id} className="rounded-lg border border-warning/30 bg-surface p-4 sm:p-5">
                    <PendingNomination
                      nomination={nomination}
                      accepted={acceptedId === nomination.id}
                      busy={responsePending}
                      accepting={acceptMutation.isPending && acceptMutation.variables === nomination.id}
                      declining={declineMutation.isPending && declineMutation.variables === nomination.id}
                      onAccept={() => acceptMutation.mutate(nomination.id)}
                      onDecline={() => declineMutation.mutate(nomination.id)}
                    />
                  </li>
                ))}
              </ul>
              {responseError && <Alert tone="danger">{apiErrorMessage(t, 'recruitment', 'nominations', responseError)}</Alert>}
            </section>
          )}

          {resolved.length > 0 && (
            <section aria-labelledby="nominations-history" className="flex flex-col gap-3">
              <SectionHeading id="nominations-history" title={t('recruitment:nominations.history')} />
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {resolved.map((nomination) => (
                  <li key={nomination.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-foreground">{nomination.opportunityTitle}</p>
                      {nomination.organizationName && <p className="text-body text-foreground-secondary">{nomination.organizationName}</p>}
                      <p className="mt-1 text-caption text-foreground-secondary">
                        {t(`recruitment:nominations.statusGuidance.${nomination.status}`, { defaultValue: '' })}
                        {nomination.respondedAt && <> · {t('recruitment:nominations.respondedOn', { date: formatDate(nomination.respondedAt) })}</>}
                      </p>
                    </div>
                    <StatusBadge tone={NOMINATION_STATUS_TONE[nomination.status]}>
                      {t(`recruitment:nominationStatusValues.${nomination.status}`)}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PageContainer>
  )
}

function PendingNomination({
  nomination,
  accepted,
  busy,
  accepting,
  declining,
  onAccept,
  onDecline,
}: {
  nomination: StudentNominationResponse
  accepted: boolean
  busy: boolean
  accepting: boolean
  declining: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-caption font-semibold text-foreground-secondary">
            <Icon name="graduationCap" className="size-3.5" />
            {t('recruitment:nominations.nominatedBy')}
          </p>
          <h3 className="mt-1 break-words text-body-lg font-semibold text-foreground">{nomination.opportunityTitle}</h3>
          {nomination.organizationName && <p className="text-body text-foreground-secondary">{nomination.organizationName}</p>}
        </div>
        {/* No status badge: the section heading already says every card here awaits consent. */}
      </div>

      {nomination.note && (
        <div className="rounded-lg bg-surface-muted p-3">
          <p className="text-caption font-semibold text-foreground-secondary">{t('recruitment:nominations.noteLabel')}</p>
          <p className="mt-1 whitespace-pre-line break-words text-body text-foreground">{nomination.note}</p>
        </div>
      )}

      <p className="text-caption text-foreground-secondary">{t('recruitment:nominations.nominatedOn', { date: formatDate(nomination.createdAt) })}</p>

      {accepted ? (
        <div className="flex flex-col items-center gap-2">
          <AnimatedCheck label={t('recruitment:nominations.acceptedTitle')} />
          <Link to="/student/applications" className="rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
            {t('recruitment:nominations.viewApplications')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button loading={accepting} disabled={busy} onClick={onAccept} className="w-full sm:w-auto">
            {t('recruitment:nominations.accept')}
          </Button>
          <Button variant="outline" loading={declining} disabled={busy} onClick={onDecline} className="w-full sm:w-auto">
            {t('recruitment:nominations.decline')}
          </Button>
        </div>
      )}
    </div>
  )
}
