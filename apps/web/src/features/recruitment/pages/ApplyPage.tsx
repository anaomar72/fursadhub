import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import * as publicOpportunityApi from '../../opportunities/api/publicOpportunityApi'
import { ScreeningQuestionFields } from '../components/ScreeningQuestionFields'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AnimatedCheck, Button, LoadingSpinner } from '../../../components/ui'
import type { ScreeningQuestionResponse } from '../types'

/**
 * Student self-application to a PUBLIC/HYBRID opportunity (CLAUDE.md Phase 4 section 25).
 *
 * <p>Client-side required-answer checks are UX only — the backend re-validates every answer against
 * the opportunity's own questions, which is the real boundary (CLAUDE.md section 24).
 */
export function ApplyPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const queryClient = useQueryClient()

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const opportunityQuery = useQuery({
    queryKey: ['public', 'opportunity', opportunityId],
    queryFn: () => publicOpportunityApi.getPublicOpportunity(opportunityId!),
    enabled: !!opportunityId,
  })

  const questionsQuery = useQuery({
    queryKey: ['recruitment', 'screening-questions', opportunityId],
    queryFn: () => recruitmentApi.listPublicScreeningQuestions(opportunityId!),
    enabled: !!opportunityId,
  })

  const applyMutation = useMutation({
    mutationFn: () =>
      recruitmentApi.applyToOpportunity(
        opportunityId!,
        // Blank optional answers are simply not sent.
        Object.entries(answers)
          .filter(([, value]) => value.trim() !== '')
          .map(([questionId, answer]) => ({ questionId, answer })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'my-candidacies'] })
    },
  })

  const questions: ScreeningQuestionResponse[] = questionsQuery.data ?? []

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (applyMutation.isPending || applyMutation.isSuccess) {
      return
    }

    const missing: Record<string, string> = {}
    for (const question of questions) {
      if (question.required && !(answers[question.id] ?? '').trim()) {
        missing[question.id] = t('recruitment:apply.errors.answerRequired')
      }
    }
    setFieldErrors(missing)
    if (Object.keys(missing).length > 0) {
      return
    }

    applyMutation.mutate()
  }

  if (opportunityQuery.isLoading || questionsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const opportunity = opportunityQuery.data

  // One-time success confirmation, then a stable state — no looping animation
  // (BRAND_AND_UI_GUIDELINES.md section 15).
  if (applyMutation.isSuccess) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <AnimatedCheck label={t('recruitment:apply.successTitle')} />
          <p className="text-sm text-foreground-secondary">{t('recruitment:apply.successBody')}</p>
          <Link
            to="/student/applications"
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            {t('recruitment:apply.viewApplications')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('recruitment:apply.title')}</h1>
      {opportunity && (
        <p className="mt-1 text-sm text-foreground-secondary">
          {opportunity.title} · {opportunity.organization.name}
        </p>
      )}

      <form className="mt-6 flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
        <ScreeningQuestionFields
          questions={questions}
          answers={answers}
          errors={fieldErrors}
          disabled={applyMutation.isPending}
          onChange={(questionId, value) => {
            setAnswers((current) => ({ ...current, [questionId]: value }))
            setFieldErrors((current) => {
              if (!current[questionId]) {
                return current
              }
              const next = { ...current }
              delete next[questionId]
              return next
            })
          }}
        />

        {questions.length === 0 && (
          <p className="text-sm text-foreground-secondary">{t('recruitment:apply.noQuestions')}</p>
        )}

        {applyMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'recruitment', 'apply', applyMutation.error)}
          </p>
        )}

        <Button type="submit" loading={applyMutation.isPending} className="w-full sm:w-auto">
          {t('recruitment:apply.submit')}
        </Button>
      </form>
    </div>
  )
}
