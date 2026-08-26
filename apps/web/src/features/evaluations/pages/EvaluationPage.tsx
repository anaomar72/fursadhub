import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Button, FormField, LoadingSpinner, Select, StatusBadge, Textarea } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as evaluationsApi from '../api/evaluationsApi'
import {
  EVALUATION_RATING_FIELDS,
  type EvaluationDraftInput,
  type EvaluationRatingField,
  type EvaluationResponse,
  type EvaluationState,
} from '../types'

const RATINGS = [1, 2, 3, 4, 5]

const STATE_TONE: Record<EvaluationState, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  FINAL: 'success',
}

interface EvaluationPageProps {
  /**
   * `evaluator` is the assigned organization supervisor — the only party who may author. Everyone
   * else reads, and the backend simply returns nothing to a student until the evaluation is FINAL.
   */
  audience: 'evaluator' | 'reader'
}

/**
 * The organization's assessment of the student.
 *
 * <p>The form is written out field by field rather than generated from a schema, because FursadHub
 * deliberately has no rubric builder (CLAUDE.md section 44): the V1 evaluation is six fixed ratings
 * and three comments, and that should be as obvious in the UI as it is in the database.
 */
export function EvaluationPage({ audience }: EvaluationPageProps) {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()

  const evaluationQuery = useQuery({
    queryKey: ['evaluation', placementId],
    queryFn: () => evaluationsApi.getEvaluation(placementId!),
    enabled: !!placementId,
  })

  if (evaluationQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const evaluation = evaluationQuery.data ?? null

  if (!evaluation && audience === 'reader') {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-foreground-secondary">
        {t('internship:evaluation.notAvailable')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t('internship:evaluation.title')}</h2>
        {evaluation && (
          <StatusBadge tone={STATE_TONE[evaluation.state]}>
            {t(`internship:evaluation.stateValues.${evaluation.state}`)}
          </StatusBadge>
        )}
      </div>

      {/*
        Remounted whenever the server-side identity or state changes, so the form seeds itself from
        the freshest evaluation without an effect that could clobber in-progress edits mid-typing.
      */}
      <EvaluationForm
        key={`${evaluation?.id ?? 'new'}:${evaluation?.state ?? 'DRAFT'}`}
        placementId={placementId!}
        evaluation={evaluation}
        audience={audience}
      />
    </div>
  )
}

function EvaluationForm({
  placementId,
  evaluation,
  audience,
}: {
  placementId: string
  evaluation: EvaluationResponse | null
  audience: EvaluationPageProps['audience']
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<EvaluationDraftInput>(() => toDraft(evaluation))
  const [error, setError] = useState<string | null>(null)

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['evaluation', placementId] })
    void queryClient.invalidateQueries({ queryKey: ['placement-completion', placementId] })
  }

  function run<T>(promise: Promise<T>) {
    setError(null)
    return promise.catch((cause) => {
      setError(apiErrorMessage(t, 'internship', 'evaluation', cause))
      throw cause
    })
  }

  const saveMutation = useMutation({
    mutationFn: () => run(evaluationsApi.saveEvaluationDraft(placementId, draft)),
    onSuccess: invalidate,
  })
  const submitMutation = useMutation({
    mutationFn: () => run(evaluationsApi.submitEvaluation(placementId)),
    onSuccess: invalidate,
  })
  const finalizeMutation = useMutation({
    mutationFn: () => run(evaluationsApi.finalizeEvaluation(placementId)),
    onSuccess: invalidate,
  })

  const editable = audience === 'evaluator' && (!evaluation || evaluation.state === 'DRAFT')
  const busy = saveMutation.isPending || submitMutation.isPending || finalizeMutation.isPending

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {EVALUATION_RATING_FIELDS.map((field) => (
          <RatingField
            key={field}
            field={field}
            value={draft[field] ?? null}
            readOnly={!editable}
            onChange={(value) => setDraft((current) => ({ ...current, [field]: value }))}
          />
        ))}
      </div>

      <CommentField
        field="strengths"
        value={draft.strengths ?? ''}
        readOnly={!editable}
        onChange={(value) => setDraft((current) => ({ ...current, strengths: value }))}
      />
      <CommentField
        field="improvementAreas"
        value={draft.improvementAreas ?? ''}
        readOnly={!editable}
        onChange={(value) => setDraft((current) => ({ ...current, improvementAreas: value }))}
      />
      <CommentField
        field="finalComments"
        value={draft.finalComments ?? ''}
        readOnly={!editable}
        onChange={(value) => setDraft((current) => ({ ...current, finalComments: value }))}
      />

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {audience === 'evaluator' && (
        <div className="flex flex-wrap gap-2">
          {editable && (
            <>
              <Button variant="outline" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {t('internship:evaluation.actions.saveDraft')}
              </Button>
              <Button loading={submitMutation.isPending} disabled={busy} onClick={() => submitMutation.mutate()}>
                {t('internship:evaluation.actions.submit')}
              </Button>
            </>
          )}
          {evaluation?.state === 'SUBMITTED' && (
            <Button loading={finalizeMutation.isPending} onClick={() => finalizeMutation.mutate()}>
              {t('internship:evaluation.actions.finalize')}
            </Button>
          )}
          {evaluation?.state === 'FINAL' && (
            <p className="text-sm text-foreground-secondary">{t('internship:evaluation.sealed')}</p>
          )}
        </div>
      )}
    </>
  )
}

function toDraft(evaluation: EvaluationResponse | null): EvaluationDraftInput {
  if (!evaluation) {
    return {}
  }
  return {
    professionalismRating: evaluation.professionalismRating,
    reliabilityRating: evaluation.reliabilityRating,
    communicationRating: evaluation.communicationRating,
    workPerformanceRating: evaluation.workPerformanceRating,
    teamworkRating: evaluation.teamworkRating,
    overallRating: evaluation.overallRating,
    strengths: evaluation.strengths,
    improvementAreas: evaluation.improvementAreas,
    finalComments: evaluation.finalComments,
  }
}

function RatingField({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: EvaluationRatingField
  value: number | null
  readOnly: boolean
  onChange: (value: number | null) => void
}) {
  const { t } = useTranslation()
  const label = t(`internship:evaluation.fields.${field}`)

  if (readOnly) {
    return (
      <div>
        <p className="text-sm text-foreground-secondary">{label}</p>
        <p className="mt-0.5 text-foreground">
          {value === null ? t('internship:evaluation.notRated') : t('internship:evaluation.ratingOf', { value })}
        </p>
      </div>
    )
  }

  return (
    <FormField label={label} htmlFor={field}>
      <Select
        id={field}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      >
        <option value="">{t('internship:evaluation.chooseRating')}</option>
        {RATINGS.map((rating) => (
          <option key={rating} value={rating}>
            {t('internship:evaluation.ratingOf', { value: rating })}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function CommentField({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: 'strengths' | 'improvementAreas' | 'finalComments'
  value: string
  readOnly: boolean
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const label = t(`internship:evaluation.fields.${field}`)

  if (readOnly) {
    return (
      <div>
        <p className="text-sm text-foreground-secondary">{label}</p>
        <p className="mt-0.5 whitespace-pre-line text-foreground">{value || '—'}</p>
      </div>
    )
  }

  return (
    <FormField label={label} htmlFor={field}>
      <Textarea id={field} value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  )
}
