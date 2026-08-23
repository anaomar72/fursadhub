import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { CANDIDACY_STATUS_TONE, OFFER_STATUS_TONE } from '../components/statusTone'
import { offerFormSchema, type OfferFormValues } from '../schemas/offerFormSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Input, LoadingSpinner, StatusBadge, Textarea } from '../../../components/ui'
import type { CandidacyStatus } from '../types'

/** Which stage commands make sense from the current state — UX only; the backend is authoritative. */
function availableCommands(status: CandidacyStatus): string[] {
  switch (status) {
    case 'SUBMITTED':
      return ['review', 'shortlist', 'reject']
    case 'UNDER_REVIEW':
      return ['shortlist', 'interview', 'reject']
    case 'SHORTLISTED':
      return ['interview', 'reject']
    case 'INTERVIEW':
      return ['reject']
    default:
      return []
  }
}

function canOffer(status: CandidacyStatus): boolean {
  return ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFER_EXPIRED'].includes(status)
}

/**
 * Candidate detail and recruitment actions for organization staff (CLAUDE.md Phase 4 section 27).
 *
 * <p>Every action is an explicit business command — there is no status dropdown, matching the
 * backend's command endpoints (CLAUDE.md section 10).
 */
export function CandidateDetailPage() {
  const { t } = useTranslation()
  const { candidacyId } = useParams<{ candidacyId: string }>()
  const queryClient = useQueryClient()

  const candidateQuery = useQuery({
    queryKey: ['recruitment', 'candidate', candidacyId],
    queryFn: () => recruitmentApi.getCandidate(candidacyId!),
    enabled: !!candidacyId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'candidate', candidacyId] })
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'candidates'] })
  }

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

  if (candidateQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const candidate = candidateQuery.data
  if (!candidate) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('recruitment:candidate.notFound')}
      </p>
    )
  }

  const commands = availableCommands(candidate.status)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
          </h1>
          <p className="mt-1 text-sm text-foreground-secondary">
            {t(`recruitment:sourceValues.${candidate.source}`)}
          </p>
        </div>
        <StatusBadge tone={CANDIDACY_STATUS_TONE[candidate.status]}>
          {t(`recruitment:candidacyStatusValues.${candidate.status}`)}
        </StatusBadge>
      </div>

      {candidate.answers.length > 0 && (
        <section className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">{t('recruitment:candidate.answersTitle')}</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            {candidate.answers.map((answer) => (
              <div key={answer.questionId}>
                <dt className="text-foreground-secondary">{answer.questionId}</dt>
                <dd className="mt-0.5 text-foreground">{answer.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {commands.length > 0 && (
        <section className="mt-6 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {commands.map((command) => (
              <Button
                key={command}
                variant={command === 'reject' ? 'danger' : command === 'review' ? 'outline' : 'primary'}
                loading={commandMutation.isPending && commandMutation.variables === command}
                disabled={commandMutation.isPending}
                onClick={() => commandMutation.mutate(command)}
              >
                {t(`recruitment:candidate.commands.${command}`)}
              </Button>
            ))}
          </div>
          {commandMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'recruitment', 'candidate', commandMutation.error)}
            </p>
          )}
        </section>
      )}

      {candidate.offers.length > 0 && (
        <section className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">{t('recruitment:candidate.offersTitle')}</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {candidate.offers.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground-secondary">
                  {offer.startDate} — {offer.endDate}
                </span>
                <StatusBadge tone={OFFER_STATUS_TONE[offer.status]}>
                  {t(`recruitment:offerStatusValues.${offer.status}`)}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canOffer(candidate.status) && (
        <form
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
          noValidate
          onSubmit={offerForm.handleSubmit((values) => offerMutation.mutate(values))}
        >
          <h2 className="text-sm font-semibold text-foreground">{t('recruitment:candidate.sendOfferTitle')}</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

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

          <FormField label={t('recruitment:candidate.details')} htmlFor="offer-details">
            <Textarea id="offer-details" rows={3} {...offerForm.register('details')} />
          </FormField>

          {offerMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'recruitment', 'candidate', offerMutation.error)}
            </p>
          )}

          <Button type="submit" loading={offerMutation.isPending} className="w-full sm:w-auto">
            {t('recruitment:candidate.sendOffer')}
          </Button>
        </form>
      )}
    </div>
  )
}

/** Zod messages are translation keys, never user-facing English (CLAUDE.md section 56). */
function fieldError(t: (key: string) => string, message?: string): string | undefined {
  return message ? t(`recruitment:candidate.errors.${message}`) : undefined
}
