import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as recruitmentApi from '../api/recruitmentApi'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Input, Select } from '../../../components/ui'
import { MAX_SCREENING_QUESTIONS, type ScreeningQuestionType } from '../types'

/**
 * Authoring an opportunity's screening questions while it is still a draft
 * (CLAUDE.md Phase 4 section 9).
 *
 * <p>Only the four approved types are offered and the five-question cap is reflected in the UI —
 * both are also enforced by the backend and the database, so this is convenience, not control.
 */
export function ScreeningQuestionEditor({ opportunityId }: { opportunityId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<ScreeningQuestionType>('SHORT_TEXT')
  const [required, setRequired] = useState(true)
  const [choicesText, setChoicesText] = useState('')

  const questionsQuery = useQuery({
    queryKey: ['recruitment', 'screening-questions', 'manage', opportunityId],
    queryFn: () => recruitmentApi.listScreeningQuestions(opportunityId),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'screening-questions', 'manage', opportunityId] })

  const addMutation = useMutation({
    mutationFn: () =>
      recruitmentApi.addScreeningQuestion(opportunityId, {
        prompt,
        type,
        required,
        choices:
          type === 'SINGLE_CHOICE'
            ? choicesText
                .split('\n')
                .map((choice) => choice.trim())
                .filter(Boolean)
            : undefined,
      }),
    onSuccess: () => {
      setPrompt('')
      setChoicesText('')
      setType('SHORT_TEXT')
      setRequired(true)
      invalidate()
    },
  })

  const removeMutation = useMutation({
    mutationFn: (questionId: string) => recruitmentApi.removeScreeningQuestion(opportunityId, questionId),
    onSuccess: invalidate,
  })

  const questions = questionsQuery.data ?? []
  const atLimit = questions.length >= MAX_SCREENING_QUESTIONS

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{t('recruitment:screening.title')}</h2>
      <p className="mt-1 text-xs text-foreground-secondary">
        {t('recruitment:screening.limitHint', { max: MAX_SCREENING_QUESTIONS })}
      </p>

      <ul className="mt-3 divide-y divide-border">
        {questions.map((question) => (
          <li key={question.id} className="flex items-start justify-between gap-3 py-2">
            <div className="text-sm">
              <p className="font-medium text-foreground">{question.prompt}</p>
              <p className="text-xs text-foreground-secondary">
                {t(`recruitment:screening.typeValues.${question.type}`)}
                {question.required ? ` · ${t('recruitment:screening.required')}` : ''}
                {question.choices.length > 0 ? ` · ${question.choices.join(', ')}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-danger hover:underline"
              onClick={() => removeMutation.mutate(question.id)}
            >
              {t('recruitment:screening.remove')}
            </button>
          </li>
        ))}
        {questions.length === 0 && (
          <li className="py-3 text-center text-sm text-foreground-secondary">{t('recruitment:screening.empty')}</li>
        )}
      </ul>

      {!atLimit && (
        <form
          className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            addMutation.mutate()
          }}
        >
          <FormField label={t('recruitment:screening.promptLabel')} htmlFor="screening-prompt">
            <Input
              id="screening-prompt"
              value={prompt}
              maxLength={500}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </FormField>

          <FormField label={t('recruitment:screening.typeLabel')} htmlFor="screening-type">
            <Select
              id="screening-type"
              value={type}
              onChange={(event) => setType(event.target.value as ScreeningQuestionType)}
            >
              <option value="SHORT_TEXT">{t('recruitment:screening.typeValues.SHORT_TEXT')}</option>
              <option value="LONG_TEXT">{t('recruitment:screening.typeValues.LONG_TEXT')}</option>
              <option value="YES_NO">{t('recruitment:screening.typeValues.YES_NO')}</option>
              <option value="SINGLE_CHOICE">{t('recruitment:screening.typeValues.SINGLE_CHOICE')}</option>
            </Select>
          </FormField>

          {type === 'SINGLE_CHOICE' && (
            <FormField label={t('recruitment:screening.choicesLabel')} htmlFor="screening-choices">
              <textarea
                id="screening-choices"
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                value={choicesText}
                onChange={(event) => setChoicesText(event.target.value)}
              />
            </FormField>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
              className="size-4 rounded border-border"
            />
            {t('recruitment:screening.requiredLabel')}
          </label>

          {addMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'recruitment', 'screening', addMutation.error)}
            </p>
          )}

          <Button
            type="submit"
            variant="outline"
            loading={addMutation.isPending}
            disabled={!prompt.trim()}
            className="w-full sm:w-auto"
          >
            {t('recruitment:screening.add')}
          </Button>
        </form>
      )}
    </div>
  )
}
