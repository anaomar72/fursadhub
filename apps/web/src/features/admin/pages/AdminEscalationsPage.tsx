import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Input, LoadingSpinner, StatusBadge } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'

type EscalationAction = 'verify' | 'reject' | 'request-more-evidence'

/** Commands that must carry a reason the student will be shown. */
const NEEDS_NOTE: EscalationAction[] = ['reject', 'request-more-evidence']

/**
 * Escalated student verification cases (Phase 7 "Admin: verification escalation").
 *
 * <p>Resolutions use the same frozen transitions a university uses — there is no platform-only
 * state. The student's evidence is fetched as a blob through the authorized, audited endpoint, never
 * linked to object storage (CLAUDE.md sections 31, 47).
 */
export function AdminEscalationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<{ caseId: string; action: EscalationAction } | null>(null)
  const [note, setNote] = useState('')

  const escalationsQuery = useQuery({
    queryKey: ['admin', 'escalations'],
    queryFn: adminApi.listEscalations,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ caseId, action, reviewNote }: { caseId: string; action: EscalationAction; reviewNote?: string }) => {
      setError(null)
      return adminApi.resolveEscalation(caseId, action, reviewNote).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'escalations', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setNoteFor(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'escalations'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async (caseId: string) => {
      setError(null)
      const blob = await adminApi.downloadEscalationEvidence(caseId).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'escalations', cause))
        throw cause
      })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = 'verification-evidence'
      anchor.click()
      // Released immediately so the blob does not outlive the click that needed it.
      URL.revokeObjectURL(objectUrl)
    },
  })

  if (escalationsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const cases = escalationsQuery.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{t('admin:escalations.title')}</h1>
        <p className="mt-1 text-sm text-foreground-secondary">{t('admin:escalations.description')}</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {cases.length === 0 ? (
        <p className="text-sm text-foreground-secondary">{t('admin:escalations.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cases.map((escalated) => (
            <li key={escalated.caseId} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-foreground">
                    {escalated.studentEmail ?? t('admin:escalations.unknownStudent')}
                  </h2>
                  <p className="text-xs text-foreground-secondary">
                    {t('admin:escalations.enrollment', {
                      studentNumber: escalated.studentNumber,
                      program: escalated.program,
                      year: escalated.academicYear,
                    })}
                  </p>
                </div>
                <StatusBadge tone="warning">
                  {t(`admin:verificationStatuses.${escalated.status}`, escalated.status)}
                </StatusBadge>
              </div>

              {escalated.escalationReason && (
                <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground">
                  <span className="font-medium">{t('admin:escalations.reason')}: </span>
                  {escalated.escalationReason}
                </p>
              )}

              {noteFor?.caseId === escalated.caseId ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    resolveMutation.mutate({
                      caseId: escalated.caseId,
                      action: noteFor.action,
                      reviewNote: note,
                    })
                  }}
                >
                  <FormField
                    label={t(`admin:escalations.actions.${noteFor.action}`)}
                    htmlFor={`escalation-note-${escalated.caseId}`}
                  >
                    <Input
                      id={`escalation-note-${escalated.caseId}`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t('admin:escalations.notePlaceholder')}
                      maxLength={2000}
                    />
                  </FormField>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={resolveMutation.isPending}>
                      {t('admin:escalations.confirm')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setNoteFor(null)}>
                      {t('admin:escalations.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => resolveMutation.mutate({ caseId: escalated.caseId, action: 'verify' })}
                    disabled={resolveMutation.isPending}
                  >
                    {t('admin:escalations.actions.verify')}
                  </Button>
                  {NEEDS_NOTE.map((action) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNoteFor({ caseId: escalated.caseId, action })
                        setNote('')
                      }}
                      disabled={resolveMutation.isPending}
                    >
                      {t(`admin:escalations.actions.${action}`)}
                    </Button>
                  ))}
                  {escalated.hasEvidence ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadMutation.mutate(escalated.caseId)}
                      disabled={downloadMutation.isPending}
                    >
                      {t('admin:escalations.downloadEvidence')}
                    </Button>
                  ) : (
                    <span className="self-center text-xs text-foreground-secondary">
                      {t('admin:escalations.noEvidence')}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
