import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Select, Textarea } from '../../../components/ui'
import type { WeeklyLogInput, WeeklyLogResponse } from '../types'

interface WeeklyLogFormProps {
  /** Weeks the student may still create. Empty when every week already has a log. */
  availableWeeks?: number[]
  existing?: WeeklyLogResponse
  submitting: boolean
  error?: string | null
  onSubmit: (weekNumber: number, input: WeeklyLogInput) => void
  onCancel?: () => void
}

/**
 * Create or edit one weekly log.
 *
 * <p>The week list comes from the backend's expected-week count, so a student can only file weeks
 * this internship actually has — the same range the backend enforces, offered rather than guessed.
 *
 * <p>The submit button is disabled while a request is in flight, which is what stops a
 * double-clicked "create week 3" from ever reaching the server twice; the database constraint behind
 * it is the real guarantee, this is the courtesy.
 */
export function WeeklyLogForm({
  availableWeeks,
  existing,
  submitting,
  error,
  onSubmit,
  onCancel,
}: WeeklyLogFormProps) {
  const { t } = useTranslation()
  const [weekNumber, setWeekNumber] = useState(
    () => existing?.weekNumber ?? availableWeeks?.[0] ?? 1,
  )
  const [summary, setSummary] = useState(existing?.summary ?? '')
  const [activities, setActivities] = useState(existing?.activities ?? '')
  const [challenges, setChallenges] = useState(existing?.challenges ?? '')
  const [learningOutcomes, setLearningOutcomes] = useState(existing?.learningOutcomes ?? '')
  const [summaryError, setSummaryError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!summary.trim()) {
      setSummaryError(t('internship:weeklyLogs.form.summaryRequired'))
      return
    }
    setSummaryError(null)
    onSubmit(weekNumber, {
      summary: summary.trim(),
      activities: activities.trim() || undefined,
      challenges: challenges.trim() || undefined,
      learningOutcomes: learningOutcomes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">
        {existing
          ? t('internship:weeklyLogs.form.editTitle', { week: existing.weekNumber })
          : t('internship:weeklyLogs.form.createTitle')}
      </h3>

      {!existing && (
        <FormField label={t('internship:weeklyLogs.form.week')} htmlFor="weekNumber">
          <Select
            id="weekNumber"
            value={weekNumber}
            onChange={(event) => setWeekNumber(Number(event.target.value))}
          >
            {(availableWeeks ?? []).map((week) => (
              <option key={week} value={week}>
                {t('internship:weeklyLogs.form.weekOption', { week })}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField
        label={t('internship:weeklyLogs.form.summary')}
        htmlFor="summary"
        error={summaryError ?? undefined}
      >
        <Textarea
          id="summary"
          value={summary}
          invalid={!!summaryError}
          onChange={(event) => setSummary(event.target.value)}
          placeholder={t('internship:weeklyLogs.form.summaryPlaceholder')}
        />
      </FormField>

      <FormField label={t('internship:weeklyLogs.form.activities')} htmlFor="activities">
        <Textarea id="activities" value={activities} onChange={(event) => setActivities(event.target.value)} />
      </FormField>

      <FormField label={t('internship:weeklyLogs.form.challenges')} htmlFor="challenges">
        <Textarea id="challenges" value={challenges} onChange={(event) => setChallenges(event.target.value)} />
      </FormField>

      <FormField label={t('internship:weeklyLogs.form.learningOutcomes')} htmlFor="learningOutcomes">
        <Textarea
          id="learningOutcomes"
          value={learningOutcomes}
          onChange={(event) => setLearningOutcomes(event.target.value)}
        />
      </FormField>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={submitting}>
          {existing ? t('internship:weeklyLogs.form.save') : t('internship:weeklyLogs.form.create')}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {t('internship:actions.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
