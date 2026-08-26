import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Button, FormField, Input, LoadingSpinner, Select, StatusBadge, Textarea } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as defenseApi from '../api/defenseApi'
import type { DefenseAttemptResponse, DefenseAttemptState, DefenseResult } from '../types'

const RESULTS: DefenseResult[] = ['PASSED', 'FAILED', 'RETAKE_REQUIRED']

const STATE_TONE: Record<DefenseAttemptState, StatusTone> = {
  SCHEDULED: 'info',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
}

/** The result carries the meaning once an attempt is completed, so it overrides the state tone. */
const RESULT_TONE: Record<DefenseResult, StatusTone> = {
  PASSED: 'success',
  FAILED: 'danger',
  RETAKE_REQUIRED: 'warning',
}

interface DefensePageProps {
  /** University staff manage attempts; the student reads their own history. */
  audience: 'university' | 'student'
}

/**
 * Defense attempts, newest action first but ALL attempts shown.
 *
 * <p>Every attempt is rendered, including cancelled and failed ones. That is the point of the domain
 * model: a retake creates a new attempt and the previous one is preserved, so the UI must show the
 * history rather than only the latest sitting (CLAUDE.md section 46).
 */
export function DefensePage({ audience }: DefensePageProps) {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [recordingFor, setRecordingFor] = useState<string | null>(null)

  const attemptsQuery = useQuery({
    queryKey: ['defense-attempts', placementId],
    queryFn: () => defenseApi.listDefenseAttempts(placementId!),
    enabled: !!placementId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['defense-attempts', placementId] })
    void queryClient.invalidateQueries({ queryKey: ['placement-completion', placementId] })
  }

  function run<T>(promise: Promise<T>) {
    setError(null)
    return promise.catch((cause) => {
      setError(apiErrorMessage(t, 'internship', 'defense', cause))
      throw cause
    })
  }

  const scheduleMutation = useMutation({
    mutationFn: ({ scheduledAt, location }: { scheduledAt: string; location: string }) =>
      run(defenseApi.scheduleDefense(placementId!, scheduledAt, location || undefined)),
    onSuccess: () => {
      setScheduling(false)
      invalidate()
    },
  })
  const cancelMutation = useMutation({
    mutationFn: (attemptId: string) => run(defenseApi.cancelDefenseAttempt(attemptId)),
    onSuccess: invalidate,
  })
  const resultMutation = useMutation({
    mutationFn: ({ attemptId, result, notes }: { attemptId: string; result: DefenseResult; notes: string }) =>
      run(defenseApi.recordDefenseResult(attemptId, result, notes || undefined)),
    onSuccess: () => {
      setRecordingFor(null)
      invalidate()
    },
  })

  if (attemptsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const attempts = attemptsQuery.data ?? []
  const hasOpenAttempt = attempts.some((attempt) => attempt.state === 'SCHEDULED')
  const busy = scheduleMutation.isPending || cancelMutation.isPending || resultMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('internship:defense.title')}</h2>
          <p className="mt-0.5 text-sm text-foreground-secondary">{t('internship:defense.historyNote')}</p>
        </div>
        {audience === 'university' && !scheduling && !hasOpenAttempt && (
          <Button size="sm" onClick={() => setScheduling(true)}>
            {attempts.length === 0
              ? t('internship:defense.actions.schedule')
              : t('internship:defense.actions.scheduleRetake')}
          </Button>
        )}
      </div>

      {scheduling && (
        <ScheduleForm
          submitting={scheduleMutation.isPending}
          onSubmit={(scheduledAt, location) => scheduleMutation.mutate({ scheduledAt, location })}
          onCancel={() => setScheduling(false)}
        />
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {attempts.length === 0 && !scheduling ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-foreground-secondary">
          {t('internship:defense.empty')}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <AttemptCard
                attempt={attempt}
                audience={audience}
                busy={busy}
                recording={recordingFor === attempt.id}
                onStartRecording={() => setRecordingFor(attempt.id)}
                onStopRecording={() => setRecordingFor(null)}
                onCancel={() => cancelMutation.mutate(attempt.id)}
                onRecord={(result, notes) =>
                  resultMutation.mutate({ attemptId: attempt.id, result, notes })
                }
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function AttemptCard({
  attempt,
  audience,
  busy,
  recording,
  onStartRecording,
  onStopRecording,
  onCancel,
  onRecord,
}: {
  attempt: DefenseAttemptResponse
  audience: DefensePageProps['audience']
  busy: boolean
  recording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onCancel: () => void
  onRecord: (result: DefenseResult, notes: string) => void
}) {
  const { t } = useTranslation()
  const [result, setResult] = useState<DefenseResult>('PASSED')
  const [notes, setNotes] = useState('')

  const tone = attempt.result ? RESULT_TONE[attempt.result] : STATE_TONE[attempt.state]
  const label = attempt.result
    ? t(`internship:defense.resultValues.${attempt.result}`)
    : t(`internship:defense.stateValues.${attempt.state}`)

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('internship:defense.attemptHeading', { number: attempt.attemptNumber })}
          </h3>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {new Date(attempt.scheduledAt).toLocaleString()}
            {attempt.locationDetails ? ` · ${attempt.locationDetails}` : ''}
          </p>
        </div>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </div>

      {attempt.panelNotes && (
        <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground-secondary">
          {attempt.panelNotes}
        </p>
      )}

      {audience === 'university' && attempt.state === 'SCHEDULED' && !recording && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onStartRecording} disabled={busy}>
            {t('internship:defense.actions.recordResult')}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
            {t('internship:defense.actions.cancelAttempt')}
          </Button>
        </div>
      )}

      {recording && (
        <div className="mt-4 flex flex-col gap-3">
          <FormField label={t('internship:defense.resultLabel')} htmlFor={`result-${attempt.id}`}>
            <Select
              id={`result-${attempt.id}`}
              value={result}
              onChange={(event) => setResult(event.target.value as DefenseResult)}
            >
              {RESULTS.map((option) => (
                <option key={option} value={option}>
                  {t(`internship:defense.resultValues.${option}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('internship:defense.panelNotes')} htmlFor={`notes-${attempt.id}`}>
            <Textarea
              id={`notes-${attempt.id}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </FormField>
          {/* Recording RETAKE_REQUIRED completes this attempt; a new one is scheduled separately. */}
          <p className="text-xs text-foreground-secondary">{t('internship:defense.retakeNote')}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={busy} onClick={() => onRecord(result, notes)}>
              {t('internship:defense.actions.confirmResult')}
            </Button>
            <Button size="sm" variant="outline" onClick={onStopRecording} disabled={busy}>
              {t('internship:actions.cancel')}
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

function ScheduleForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  submitting: boolean
  onSubmit: (scheduledAt: string, location: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [localDateTime, setLocalDateTime] = useState('')
  const [location, setLocation] = useState('')

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (localDateTime) {
          // datetime-local is wall-clock in the viewer's zone; the backend stores an Instant in UTC,
          // so it is converted here rather than sent as an ambiguous local string.
          onSubmit(new Date(localDateTime).toISOString(), location)
        }
      }}
    >
      <FormField label={t('internship:defense.scheduledAt')} htmlFor="defense-when">
        <Input
          id="defense-when"
          type="datetime-local"
          required
          value={localDateTime}
          onChange={(event) => setLocalDateTime(event.target.value)}
        />
      </FormField>
      <FormField label={t('internship:defense.location')} htmlFor="defense-where">
        <Input
          id="defense-where"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder={t('internship:defense.locationPlaceholder')}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={submitting}>
          {t('internship:defense.actions.confirmSchedule')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t('internship:actions.cancel')}
        </Button>
      </div>
    </form>
  )
}
