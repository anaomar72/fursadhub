import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Button, LoadingSpinner } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as weeklyLogsApi from '../api/weeklyLogsApi'
import { WeeklyLogCard } from '../components/WeeklyLogCard'
import { WeeklyLogForm } from '../components/WeeklyLogForm'
import type { WeeklyLogInput, WeeklyLogResponse } from '../types'

interface WeeklyLogsPageProps {
  /**
   * The student authors; the reviewer reviews and returns. The same page serves both because the
   * data and the reading experience are identical — only the available commands differ, and the
   * backend enforces that split regardless of what this renders.
   */
  audience: 'student' | 'reviewer'
}

export function WeeklyLogsPage({ audience }: WeeklyLogsPageProps) {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()
  const queryClient = useQueryClient()
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<WeeklyLogResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const logsQuery = useQuery({
    queryKey: ['weekly-logs', placementId],
    queryFn: () => weeklyLogsApi.listWeeklyLogs(placementId!),
    enabled: !!placementId,
  })

  // Only the student needs the week range; a reviewer never creates a log.
  const weeksQuery = useQuery({
    queryKey: ['weekly-logs', placementId, 'expected-weeks'],
    queryFn: () => weeklyLogsApi.getExpectedWeekCount(placementId!),
    enabled: !!placementId && audience === 'student',
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['weekly-logs', placementId] })
    // A reviewed log can change the completion checklist, so refresh it too.
    void queryClient.invalidateQueries({ queryKey: ['placement-completion', placementId] })
  }

  function run<T>(promise: Promise<T>, page: string) {
    setError(null)
    return promise.catch((cause) => {
      setError(apiErrorMessage(t, 'internship', page, cause))
      throw cause
    })
  }

  const createMutation = useMutation({
    mutationFn: ({ weekNumber, input }: { weekNumber: number; input: WeeklyLogInput }) =>
      run(weeklyLogsApi.createWeeklyLog(placementId!, weekNumber, input), 'weeklyLogs'),
    onSuccess: () => {
      setComposing(false)
      invalidate()
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ logId, input }: { logId: string; input: WeeklyLogInput }) =>
      run(weeklyLogsApi.updateWeeklyLog(logId, input), 'weeklyLogs'),
    onSuccess: () => {
      setEditing(null)
      invalidate()
    },
  })

  const submitMutation = useMutation({
    mutationFn: (log: WeeklyLogResponse) => run(weeklyLogsApi.submitWeeklyLog(log.id), 'weeklyLogs'),
    onSuccess: invalidate,
  })

  const reviewMutation = useMutation({
    mutationFn: (log: WeeklyLogResponse) => run(weeklyLogsApi.reviewWeeklyLog(log.id), 'weeklyLogs'),
    onSuccess: invalidate,
  })

  const returnMutation = useMutation({
    mutationFn: ({ log, comment }: { log: WeeklyLogResponse; comment: string }) =>
      run(weeklyLogsApi.returnWeeklyLog(log.id, comment), 'weeklyLogs'),
    onSuccess: invalidate,
  })

  if (logsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const logs = logsQuery.data ?? []
  const usedWeeks = new Set(logs.map((log) => log.weekNumber))
  const expectedWeeks = weeksQuery.data?.expectedWeekCount ?? 0
  const availableWeeks = Array.from({ length: expectedWeeks }, (_, index) => index + 1).filter(
    (week) => !usedWeeks.has(week),
  )

  const busy =
    createMutation.isPending ||
    editMutation.isPending ||
    submitMutation.isPending ||
    reviewMutation.isPending ||
    returnMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('internship:weeklyLogs.title')}</h2>
          {audience === 'student' && expectedWeeks > 0 && (
            <p className="mt-0.5 text-sm text-foreground-secondary">
              {t('internship:weeklyLogs.progress', { done: logs.length, total: expectedWeeks })}
            </p>
          )}
        </div>
        {audience === 'student' && !composing && availableWeeks.length > 0 && (
          <Button size="sm" onClick={() => setComposing(true)}>
            {t('internship:weeklyLogs.actions.create')}
          </Button>
        )}
      </div>

      {composing && (
        <WeeklyLogForm
          availableWeeks={availableWeeks}
          submitting={createMutation.isPending}
          error={error}
          onSubmit={(weekNumber, input) => createMutation.mutate({ weekNumber, input })}
          onCancel={() => setComposing(false)}
        />
      )}

      {editing && (
        <WeeklyLogForm
          existing={editing}
          submitting={editMutation.isPending}
          error={error}
          onSubmit={(_week, input) => editMutation.mutate({ logId: editing.id, input })}
          onCancel={() => setEditing(null)}
        />
      )}

      {logs.length === 0 && !composing ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-foreground-secondary">
          {audience === 'student'
            ? t('internship:weeklyLogs.emptyStudent')
            : t('internship:weeklyLogs.emptyReviewer')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log) => (
            <WeeklyLogCard
              key={log.id}
              log={log}
              audience={audience}
              busy={busy}
              error={error}
              onEdit={setEditing}
              onSubmit={(target) => submitMutation.mutate(target)}
              onReview={(target) => reviewMutation.mutate(target)}
              onReturn={(target, comment) => returnMutation.mutate({ log: target, comment })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
