import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Button, FormField, Input, LoadingSpinner, Select, StatusBadge, Textarea } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as attendanceApi from '../api/attendanceApi'
import type { AttendanceConfirmationStatus, AttendanceResponse, AttendanceValue } from '../types'

const ATTENDANCE_VALUES: AttendanceValue[] = ['PRESENT', 'ABSENT', 'EXCUSED']

/**
 * Settled versus unsettled is the distinction that matters, because unsettled attendance is what
 * blocks completion. Tones pair with translated text everywhere; colour alone never carries it.
 */
const CONFIRMATION_TONE: Record<AttendanceConfirmationStatus, StatusTone> = {
  RECORDED: 'info',
  CONFIRMED: 'success',
  DISPUTED: 'warning',
  RESOLVED: 'neutral',
}

interface AttendancePageProps {
  /**
   * `supervisor` is the assigned organization supervisor, who records and settles. `student` may
   * dispute their own records. `observer` (university staff, organization admins) reads only.
   */
  audience: 'supervisor' | 'student' | 'observer'
}

export function AttendancePage({ audience }: AttendancePageProps) {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [disputing, setDisputing] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')

  const attendanceQuery = useQuery({
    queryKey: ['attendance', placementId],
    queryFn: () => attendanceApi.listAttendance(placementId!),
    enabled: !!placementId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['attendance', placementId] })
    void queryClient.invalidateQueries({ queryKey: ['placement-completion', placementId] })
  }

  function run<T>(promise: Promise<T>) {
    setError(null)
    return promise.catch((cause) => {
      setError(apiErrorMessage(t, 'internship', 'attendance', cause))
      throw cause
    })
  }

  const recordMutation = useMutation({
    mutationFn: (input: { date: string; value: AttendanceValue; notes: string }) =>
      run(attendanceApi.recordAttendance(placementId!, input.date, input.value, input.notes || undefined)),
    onSuccess: invalidate,
  })

  const confirmMutation = useMutation({
    mutationFn: (recordId: string) => run(attendanceApi.confirmAttendance(recordId)),
    onSuccess: invalidate,
  })

  const disputeMutation = useMutation({
    mutationFn: ({ recordId, reason }: { recordId: string; reason: string }) =>
      run(attendanceApi.disputeAttendance(recordId, reason)),
    onSuccess: () => {
      setDisputing(null)
      setDisputeReason('')
      invalidate()
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (recordId: string) => run(attendanceApi.resolveAttendance(recordId, null)),
    onSuccess: invalidate,
  })

  if (attendanceQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const records = attendanceQuery.data ?? []
  const busy =
    recordMutation.isPending ||
    confirmMutation.isPending ||
    disputeMutation.isPending ||
    resolveMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">{t('internship:attendance.title')}</h2>

      {audience === 'supervisor' && (
        <RecordAttendanceForm
          submitting={recordMutation.isPending}
          onSubmit={(date, value, notes) => recordMutation.mutate({ date, value, notes })}
        />
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {records.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-foreground-secondary">
          {t('internship:attendance.empty')}
        </p>
      ) : (
        // The table scrolls inside its own container so the page body never scrolls sideways on a
        // phone, including with the longer Somali status labels.
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">{t('internship:attendance.tableCaption')}</caption>
            <thead className="bg-surface-muted text-left text-xs text-foreground-secondary">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{t('internship:attendance.date')}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t('internship:attendance.value')}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t('internship:attendance.status')}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t('internship:attendance.notes')}</th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <span className="sr-only">{t('internship:attendance.actionsHeader')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-2 text-foreground">{record.attendanceDate}</td>
                  <td className="px-3 py-2 text-foreground">
                    {t(`internship:attendance.valueValues.${record.attendanceValue}`)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={CONFIRMATION_TONE[record.confirmationStatus]}>
                      {t(`internship:attendance.statusValues.${record.confirmationStatus}`)}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2 text-foreground-secondary">
                    {record.disputeReason
                      ? t('internship:attendance.disputedBecause', { reason: record.disputeReason })
                      : (record.resolutionNote ?? record.notes ?? '—')}
                  </td>
                  <td className="px-3 py-2">
                    <RowActions
                      record={record}
                      audience={audience}
                      busy={busy}
                      onConfirm={() => confirmMutation.mutate(record.id)}
                      onResolve={() => resolveMutation.mutate(record.id)}
                      onDispute={() => setDisputing(record.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {disputing && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <label htmlFor="dispute-reason" className="text-sm font-medium text-foreground">
            {t('internship:attendance.disputeLabel')}
          </label>
          <Textarea
            id="dispute-reason"
            value={disputeReason}
            onChange={(event) => setDisputeReason(event.target.value)}
            placeholder={t('internship:attendance.disputePlaceholder')}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={disputeMutation.isPending}
              disabled={!disputeReason.trim()}
              onClick={() =>
                disputeMutation.mutate({ recordId: disputing, reason: disputeReason.trim() })
              }
            >
              {t('internship:attendance.actions.confirmDispute')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDisputing(null)} disabled={busy}>
              {t('internship:actions.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function RowActions({
  record,
  audience,
  busy,
  onConfirm,
  onResolve,
  onDispute,
}: {
  record: AttendanceResponse
  audience: AttendancePageProps['audience']
  busy: boolean
  onConfirm: () => void
  onResolve: () => void
  onDispute: () => void
}) {
  const { t } = useTranslation()

  if (audience === 'supervisor') {
    if (record.confirmationStatus === 'RECORDED') {
      return (
        <Button size="sm" variant="outline" onClick={onConfirm} disabled={busy}>
          {t('internship:attendance.actions.confirm')}
        </Button>
      )
    }
    if (record.confirmationStatus === 'DISPUTED') {
      return (
        <Button size="sm" variant="outline" onClick={onResolve} disabled={busy}>
          {t('internship:attendance.actions.resolve')}
        </Button>
      )
    }
    return null
  }

  // A confirmed record is still disputable: an error is often noticed only after confirmation.
  const disputable =
    audience === 'student' &&
    (record.confirmationStatus === 'RECORDED' || record.confirmationStatus === 'CONFIRMED')

  return disputable ? (
    <Button size="sm" variant="outline" onClick={onDispute} disabled={busy}>
      {t('internship:attendance.actions.dispute')}
    </Button>
  ) : null
}

function RecordAttendanceForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean
  onSubmit: (date: string, value: AttendanceValue, notes: string) => void
}) {
  const { t } = useTranslation()
  const [date, setDate] = useState('')
  const [value, setValue] = useState<AttendanceValue>('PRESENT')
  const [notes, setNotes] = useState('')

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        if (date) {
          onSubmit(date, value, notes)
        }
      }}
    >
      <FormField label={t('internship:attendance.date')} htmlFor="attendance-date" className="sm:flex-1">
        <Input
          id="attendance-date"
          type="date"
          value={date}
          required
          onChange={(event) => setDate(event.target.value)}
        />
      </FormField>
      <FormField label={t('internship:attendance.value')} htmlFor="attendance-value" className="sm:flex-1">
        <Select
          id="attendance-value"
          value={value}
          onChange={(event) => setValue(event.target.value as AttendanceValue)}
        >
          {ATTENDANCE_VALUES.map((option) => (
            <option key={option} value={option}>
              {t(`internship:attendance.valueValues.${option}`)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('internship:attendance.notes')} htmlFor="attendance-notes" className="sm:flex-1">
        <Input id="attendance-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </FormField>
      <Button type="submit" loading={submitting} className="sm:mb-0">
        {t('internship:attendance.actions.record')}
      </Button>
    </form>
  )
}
