import { useTranslation } from 'react-i18next'
import { FormField, Input, Select, Textarea } from '../../../components/ui'
import type { ScreeningQuestionResponse } from '../types'

export interface ScreeningQuestionFieldsProps {
  questions: ScreeningQuestionResponse[]
  answers: Record<string, string>
  onChange: (questionId: string, value: string) => void
  errors: Record<string, string>
  disabled?: boolean
}

/**
 * Renders an opportunity's screening questions as a controlled form.
 *
 * The four question types are a closed set matching the backend — this is deliberately not a
 * generic form renderer (CLAUDE.md Phase 4 section 9). Required questions are marked in text as
 * well as via `aria-required`, so the requirement is never signalled by styling alone.
 */
export function ScreeningQuestionFields({
  questions,
  answers,
  onChange,
  errors,
  disabled,
}: ScreeningQuestionFieldsProps) {
  const { t } = useTranslation()

  if (questions.length === 0) {
    return null
  }

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="text-sm font-semibold text-foreground">{t('recruitment:apply.screeningTitle')}</legend>

      {questions.map((question) => {
        const fieldId = `screening-${question.id}`
        const value = answers[question.id] ?? ''
        const error = errors[question.id]

        return (
          <FormField
            key={question.id}
            label={
              question.required
                ? t('recruitment:apply.requiredLabel', { prompt: question.prompt })
                : question.prompt
            }
            htmlFor={fieldId}
            error={error}
          >
            {question.type === 'LONG_TEXT' && (
              <Textarea
                id={fieldId}
                rows={4}
                value={value}
                aria-required={question.required}
                aria-invalid={!!error}
                onChange={(event) => onChange(question.id, event.target.value)}
              />
            )}

            {question.type === 'SHORT_TEXT' && (
              <Input
                id={fieldId}
                value={value}
                aria-required={question.required}
                aria-invalid={!!error}
                onChange={(event) => onChange(question.id, event.target.value)}
              />
            )}

            {question.type === 'YES_NO' && (
              <Select
                id={fieldId}
                value={value}
                aria-required={question.required}
                aria-invalid={!!error}
                onChange={(event) => onChange(question.id, event.target.value)}
              >
                <option value="">{t('recruitment:apply.selectPlaceholder')}</option>
                <option value="YES">{t('recruitment:apply.yes')}</option>
                <option value="NO">{t('recruitment:apply.no')}</option>
              </Select>
            )}

            {question.type === 'SINGLE_CHOICE' && (
              <Select
                id={fieldId}
                value={value}
                aria-required={question.required}
                aria-invalid={!!error}
                onChange={(event) => onChange(question.id, event.target.value)}
              >
                <option value="">{t('recruitment:apply.selectPlaceholder')}</option>
                {question.choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        )
      })}
    </fieldset>
  )
}
