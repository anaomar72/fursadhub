import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import * as opportunityApi from '../../opportunities/api/opportunityApi'
import { CANDIDACY_STATUS_TONE, OFFER_STATUS_TONE } from '../components/statusTone'
import { availableCommands, canSendOffer } from '../../organization/candidatePipeline'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { organizationCapabilities } from '../../organization/organizationCapabilities'
import { offerFormSchema, type OfferFormValues } from '../schemas/offerFormSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { saveBlob } from '../../../lib/api/privateDocument'
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  SkeletonPanel,
  ConfirmationDialog,
  PageHeader,
  StatusBadge,
  Textarea,
  Timeline,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { ProfessionalProfileSummary } from '../../student/components/ProfessionalProfileSummary'
import { PrivateDocumentPreview } from '../../../components/ui/PrivateDocumentPreview'
import { formatDate, formatDateTime } from '../../../lib/utils/formatDate'
import type { StatusTone, TimelineItem } from '../../../components/ui'

/** The status palette has an `info` tone; Timeline's dots do not. Map it to brand, keep the rest. */
const TIMELINE_TONE: Record<StatusTone, NonNullable<TimelineItem['tone']>> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'brand',
  neutral: 'neutral',
}

/**
 * One candidate, and everything recruitment may do with them.
 *
 * <p>Every action is an explicit business command — review, shortlist, interview, reject, send
 * offer, withdraw offer — because the backend exposes exactly those and no generic status write
 * (CLAUDE.md section 10). Which commands appear comes from {@code candidatePipeline.availableCommands},
 * which mirrors the server's own state machine, so the page never offers a transition the API
 * would refuse.
 *
 * <p>Only the fields the API actually returns are shown. The candidate DTO carries no university,
 * department or profile — those are deliberately not part of an organization's view of an applicant
 * — so this page shows the answers, the offers and the real audit history instead of inventing a
 * profile panel the backend cannot fill.
 *
 * <p>Two exceptions. The candidate's PROFESSIONAL profile is on the DTO and is rendered — it is the
 * presentation the student authored for exactly this purpose, and carries no enrollment identity,
 * evidence or academic record. The CV has its own endpoint keyed by CANDIDACY rather than by
 * student, so {@code StudentCvService.openForCandidacy} authorizes from the recruiting relationship
 * instead of from a role, and serves the CV bound to THIS application rather than whatever the
 * student most recently uploaded.
 */
export function CandidateDetailPage() {
  const { t } = useTranslation()
  const { candidacyId } = useParams<{ candidacyId: string }>()
  const membership = useOrganizationMembership()
  const can = organizationCapabilities(membership)
  const queryClient = useQueryClient()

  const candidateQuery = useQuery({
    queryKey: ['recruitment', 'candidate', candidacyId],
    queryFn: () => recruitmentApi.getCandidate(candidacyId!),
    enabled: !!candidacyId,
  })

  const opportunityId = candidateQuery.data?.opportunityId
  const opportunityQuery = useQuery({
    queryKey: ['opportunities', 'detail', opportunityId],
    queryFn: () => opportunityApi.getOpportunity(opportunityId!),
    enabled: !!opportunityId,
  })
  // Answers arrive keyed by question id; the prompts live on the opportunity. Without this the page
  // would render raw UUIDs as the questions, which is what it used to do.
  const questionsQuery = useQuery({
    queryKey: ['recruitment', 'screening-questions', opportunityId],
    queryFn: () => recruitmentApi.listScreeningQuestions(opportunityId!),
    enabled: !!opportunityId,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['recruitment', 'candidate', candidacyId] })
    void queryClient.invalidateQueries({ queryKey: ['recruitment', 'candidates'] })
  }

  // Which destructive action is awaiting confirmation, if any.
  const [confirming, setConfirming] = useState<{ kind: 'reject' } | { kind: 'withdraw'; offerId: string } | null>(null)
  const commandMutation = useMutation({
    mutationFn: (command: string) => {
      switch (command) {
        case 'review':
          return recruitmentApi.reviewCandidacy(candidacyId!)
        case 'shortlist':
          return recruitmentApi.shortlistCandidacy(candidacyId!)
        case 'interview':
          return recruitmentApi.interviewCandidacy(candidacyId!)
        default:
          return recruitmentApi.rejectCandidacy(candidacyId!)
      }
    },
    onSuccess: invalidate,
  })

  const offerForm = useForm<OfferFormValues>({ resolver: zodResolver(offerFormSchema) })

  const offerMutation = useMutation({
    mutationFn: (values: OfferFormValues) => recruitmentApi.sendOffer(candidacyId!, values),
    onSuccess: () => {
      offerForm.reset()
      invalidate()
    },
  })

  const withdrawOfferMutation = useMutation({
    mutationFn: (offerId: string) => recruitmentApi.withdrawOffer(candidacyId!, offerId),
    onSuccess: invalidate,
  })

  // The bytes stream through the audited API and are handed to the browser as a short-lived blob;
  // nothing here produces a URL that could be copied or shared (CLAUDE.md sections 47, 51).
  const cvMutation = useMutation({
    mutationFn: async () => {
      const blob = await recruitmentApi.downloadCandidateCv(candidacyId!)
      saveBlob(blob, 'candidate-cv')
    },
  })

  if (candidateQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonPanel rows={6} />
      </PageContainer>
    )
  }

  const candidate = candidateQuery.data
  if (!candidate) {
    return (
      <PageContainer>
        <EmptyState title={t('recruitment:candidate.notFound')} />
      </PageContainer>
    )
  }

  const commands = can.canManageCandidates ? availableCommands(candidate.status) : []
  const promptFor = (questionId: string) =>
    questionsQuery.data?.find((question) => question.id === questionId)?.prompt ?? questionId
  const liveOffer = candidate.offers.find((offer) => offer.status === 'PENDING')

  return (
    <PageContainer className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('opportunities:list.title'), to: '/organization/opportunities' },
          // Each crumb's label names its destination, as on the candidate pool one level up.
          ...(opportunityId
            ? [
                {
                  label: opportunityQuery.data?.title ?? t('recruitment:pool.title'),
                  to: `/organization/opportunities/${opportunityId}`,
                },
                { label: t('recruitment:pool.title'), to: `/organization/opportunities/${opportunityId}/candidates` },
              ]
            : []),
          { label: candidate.studentFullName ?? candidate.studentEmail ?? t('recruitment:pool.candidate') },
        ]}
      />

      <PageHeader
        eyebrow={opportunityQuery.data?.title}
        title={candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
        description={candidate.studentFullName ? (candidate.studentEmail ?? undefined) : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`recruitment:sourceValues.${candidate.source}`)}</Badge>
            <StatusBadge tone={CANDIDACY_STATUS_TONE[candidate.status]}>
              {t(`recruitment:candidacyStatusValues.${candidate.status}`)}
            </StatusBadge>
          </div>
        }
      />
      {/*
        Phase 6: a review layout. The main column is what you review — the candidate's profile,
        their answers, their CV and what has happened so far; the side column is what you decide —
        the stage actions this status allows, the offer, and sending one. Actions stay exactly the
        ones the state machine permits (availableCommands / canSendOffer).
      */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfessionalProfileSummary profile={candidate.professional} />
          <Card padding="lg">
            <h2 className="font-display text-title-panel text-foreground">
              {t('recruitment:candidate.answersTitle')}
            </h2>
            {candidate.answers.length === 0 ? (
              <p className="mt-3 text-sm text-foreground-secondary">{t('recruitment:candidate.noAnswers')}</p>
            ) : (
              <dl className="mt-4 flex flex-col gap-4">
                {candidate.answers.map((answer) => (
                  <div key={answer.questionId}>
                    <dt className="text-sm font-semibold text-foreground">{promptFor(answer.questionId)}</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm text-foreground-secondary">{answer.answer}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="font-display text-title-panel text-foreground">
              {t('recruitment:candidate.cvTitle')}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">
              {candidate.hasApplicationCv
                ? t('recruitment:candidate.cvApplicationHint')
                : t('recruitment:candidate.cvHint')}
            </p>
            {/*
              `hasApplicationCv` is true only for candidacies that bound their own CV at submission
              (V48). For those the file is known to exist, so it can be previewed in place.

              Historical candidacies predate per-application CVs and fall back to the student's
              stored CV, whose existence the DTO cannot report — so the download control stays
              unconditionally offered there and the API answers CV_NOT_FOUND if there is none.
              Either way `openForCandidacy` authorizes from the recruiting relationship and serves
              only the file belonging to THIS candidacy.
            */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {candidate.hasApplicationCv && (
                <PrivateDocumentPreview load={() => recruitmentApi.downloadCandidateCv(candidacyId!)} />
              )}
              <Button
                variant="outline"
                size="sm"
                loading={cvMutation.isPending}
                onClick={() => cvMutation.mutate()}
              >
                {t('recruitment:candidate.openCv')}
              </Button>
            </div>
            {cvMutation.isError && (
              <Alert tone="warning" className="mt-4">
                {apiErrorMessage(t, 'recruitment', 'candidate', cvMutation.error)}
              </Alert>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="font-display text-title-panel text-foreground">
              {t('recruitment:candidate.historyTitle')}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">{t('recruitment:candidate.historyHint')}</p>
            {candidate.history.length === 0 ? (
              <p className="mt-3 text-sm text-foreground-secondary">{t('recruitment:candidate.noHistory')}</p>
            ) : (
              <div className="mt-5">
              <Timeline
                label={t('recruitment:candidate.historyTitle')}
                items={[...candidate.history]
                  .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                  .map((event, index) => ({
                    id: `${event.eventType}-${event.occurredAt}-${index}`,
                    title: event.toStatus
                      ? t(`recruitment:candidacyStatusValues.${event.toStatus}`)
                      : t(`recruitment:candidate.events.${event.eventType}`, { defaultValue: humanize(event.eventType) }),
                    description: event.fromStatus
                      ? t('recruitment:candidate.transition', {
                          from: t(`recruitment:candidacyStatusValues.${event.fromStatus}`),
                        })
                      : undefined,
                    time: formatDateTime(event.occurredAt),
                    // Timeline has no `info` dot; the in-progress stages read as brand there.
                    tone: event.toStatus ? TIMELINE_TONE[CANDIDACY_STATUS_TONE[event.toStatus]] : 'neutral',
                  }))}
              />
            </div>
            )}
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label={t('recruitment:candidate.actionsTitle')}>
          {commands.length > 0 && (
            <Card padding="lg">
              <h2 className="font-display text-title-panel text-foreground">
                {t('recruitment:candidate.actionsTitle')}
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">{t('recruitment:candidate.actionsHint')}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {commands.map((command) => (
                  <Button
                    key={command}
                    variant={command === 'reject' ? 'danger' : command === 'review' ? 'outline' : 'primary'}
                        loading={commandMutation.isPending && commandMutation.variables === command}
                    disabled={commandMutation.isPending}
                    // Rejection ends the candidacy for this internship, so it is confirmed first.
                onClick={() => (command === 'reject' ? setConfirming({ kind: 'reject' }) : commandMutation.mutate(command))}
                  >
                    {t(`recruitment:candidate.commands.${command}`)}
                  </Button>
                ))}
              </div>

              {commandMutation.isError && (
                <Alert tone="danger" className="mt-4">
                  {apiErrorMessage(t, 'recruitment', 'candidate', commandMutation.error)}
                </Alert>
              )}
            </Card>
          )}
            <Card padding="lg">
              <h2 className="font-display text-title-panel text-foreground">
                {t('recruitment:candidate.offersTitle')}
              </h2>
              {candidate.offers.length === 0 ? (
                <p className="mt-3 text-sm text-foreground-secondary">{t('recruitment:candidate.noOffers')}</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {candidate.offers.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface-muted p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {t('placements:detail.dateRange', {
                            start: formatDate(offer.startDate),
                            end: formatDate(offer.endDate),
                          })}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {t('recruitment:candidate.respondBy', { date: formatDate(offer.responseDeadline) })}
                        </p>
                        {offer.location && <p className="mt-1 text-xs text-muted">{offer.location}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge tone={OFFER_STATUS_TONE[offer.status]}>
                          {t(`recruitment:offerStatusValues.${offer.status}`)}
                        </StatusBadge>
                        {can.canManageCandidates && offer.status === 'PENDING' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-danger"
                            loading={withdrawOfferMutation.isPending && withdrawOfferMutation.variables === offer.id}
                            onClick={() => setConfirming({ kind: 'withdraw', offerId: offer.id })}
                          >
                            {t('recruitment:candidate.withdrawOffer')}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {withdrawOfferMutation.isError && (
                <Alert tone="danger" className="mt-4">
                  {apiErrorMessage(t, 'recruitment', 'candidate', withdrawOfferMutation.error)}
                </Alert>
              )}
            </Card>

            {/* An offer can only be sent when the state machine allows it and no offer is live. */}
            {can.canManageCandidates && canSendOffer(candidate.status) && !liveOffer && (
              <form noValidate onSubmit={offerForm.handleSubmit((values) => offerMutation.mutate(values))}>
                <Card padding="lg" className="flex flex-col gap-4">
                  <div>
                    <h2 className="font-display text-title-panel text-foreground">
                      {t('recruitment:candidate.sendOfferTitle')}
                    </h2>
                    <p className="mt-1 text-sm text-foreground-secondary">{t('recruitment:candidate.sendOfferHint')}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      label={t('recruitment:candidate.startDate')}
                      htmlFor="offer-start"
                      error={fieldError(t, offerForm.formState.errors.startDate?.message)}
                    >
                      <Input id="offer-start" type="date" {...offerForm.register('startDate')} />
                    </FormField>
                    <FormField
                      label={t('recruitment:candidate.endDate')}
                      htmlFor="offer-end"
                      error={fieldError(t, offerForm.formState.errors.endDate?.message)}
                    >
                      <Input id="offer-end" type="date" {...offerForm.register('endDate')} />
                    </FormField>
                    <FormField
                      label={t('recruitment:candidate.responseDeadline')}
                      htmlFor="offer-deadline"
                      error={fieldError(t, offerForm.formState.errors.responseDeadline?.message)}
                    >
                      <Input id="offer-deadline" type="date" {...offerForm.register('responseDeadline')} />
                    </FormField>
                    <FormField label={t('recruitment:candidate.location')} htmlFor="offer-location">
                      <Input id="offer-location" {...offerForm.register('location')} />
                    </FormField>
                  </div>

                  <FormField label={t('recruitment:candidate.details')} htmlFor="offer-details">
                    <Textarea id="offer-details" rows={3} {...offerForm.register('details')} />
                  </FormField>

                  {offerMutation.isError && (
                    <Alert tone="danger">{apiErrorMessage(t, 'recruitment', 'candidate', offerMutation.error)}</Alert>
                  )}

                  <div className="border-t border-border pt-4">
                    <Button type="submit" loading={offerMutation.isPending}>
                      {t('recruitment:candidate.sendOffer')}
                    </Button>
                  </div>
                </Card>
              </form>
            )}
        </aside>
      </div>
      <ConfirmationDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        destructive
        loading={commandMutation.isPending || withdrawOfferMutation.isPending}
        title={t(confirming?.kind === 'withdraw' ? 'recruitment:candidate.confirmWithdraw.title' : 'recruitment:candidate.confirmReject.title')}
        description={t(confirming?.kind === 'withdraw' ? 'recruitment:candidate.confirmWithdraw.body' : 'recruitment:candidate.confirmReject.body')}
        confirmLabel={t(confirming?.kind === 'withdraw' ? 'recruitment:candidate.withdrawOffer' : 'recruitment:candidate.commands.reject')}
        cancelLabel={t('recruitment:candidate.confirmKeep')}
        onConfirm={() => {
          if (confirming?.kind === 'withdraw') withdrawOfferMutation.mutate(confirming.offerId, { onSettled: () => setConfirming(null) })
          else commandMutation.mutate('reject', { onSettled: () => setConfirming(null) })
        }}
      />
    </PageContainer>
  )
}

/** Zod messages are translation keys, never user-facing English (CLAUDE.md section 56). */
function fieldError(t: (key: string) => string, message?: string): string | undefined {
  return message ? t(`recruitment:candidate.errors.${message}`) : undefined
}

/** A readable fallback for an event type with no translation yet — never the raw enum. */
function humanize(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
