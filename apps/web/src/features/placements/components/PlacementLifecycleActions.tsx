import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as placementsApi from '../api/placementsApi'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Textarea } from '../../../components/ui'
import type { PlacementResponse, PlacementStatus } from '../types'

/** A lifecycle command that needs a written explanation before it is sent. */
type ReasonCommand = 'cancel' | 'terminate'

interface PlacementLifecycleActionsProps {
  placement: PlacementResponse
}

/**
 * The placement lifecycle commands for organization staff (CLAUDE.md section 39).
 *
 * <p>These are explicit business commands, never a status dropdown — matching the backend, which
 * exposes no generic status mutation (CLAUDE.md section 10/33). Which buttons appear is derived
 * from the current state, but that is UX only: the backend's transition table is authoritative and
 * rejects anything invalid regardless of what the UI offered.
 *
 * <p>Cancel and terminate are never presented as one action. Cancelling belongs to a placement that
 * never started; terminating to one that started and ended early — so only one of them is ever
 * offered for a given state.
 */
export function PlacementLifecycleActions({ placement }: PlacementLifecycleActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [openCommand, setOpenCommand] = useState<ReasonCommand | null>(null)
  const [reason, setReason] = useState('')

  const invalidate = () => {
    setOpenCommand(null)
    setReason('')
    queryClient.invalidateQueries({ queryKey: ['placements'] })
  }

  const startMutation = useMutation({
    mutationFn: () => placementsApi.startPlacement(placement.id),
    onSuccess: invalidate,
  })

  const requestCompletionMutation = useMutation({
    mutationFn: () => placementsApi.requestPlacementCompletion(placement.id),
    onSuccess: invalidate,
  })

  const reasonMutation = useMutation({
    mutationFn: (command: ReasonCommand) =>
      command === 'cancel'
        ? placementsApi.cancelPlacement(placement.id, reason || undefined)
        : placementsApi.terminatePlacement(placement.id, reason || undefined),
    onSuccess: invalidate,
  })

  const actions = availableActions(placement.status)
  const pending =
    startMutation.isPending || requestCompletionMutation.isPending || reasonMutation.isPending
  const error = startMutation.error ?? requestCompletionMutation.error ?? reasonMutation.error

  if (actions.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">{t('placements:actions.title')}</h2>
        <p className="mt-2 text-sm text-foreground-secondary">
          {t(`placements:actions.terminalNote.${placement.status}`)}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{t('placements:actions.title')}</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {actions.includes('start') && (
          <Button onClick={() => startMutation.mutate()} disabled={pending}>
            {t('placements:actions.start')}
          </Button>
        )}

        {actions.includes('requestCompletion') && (
          <Button onClick={() => requestCompletionMutation.mutate()} disabled={pending}>
            {t('placements:actions.requestCompletion')}
          </Button>
        )}

        {actions.includes('cancel') && (
          <Button variant="outline" onClick={() => setOpenCommand('cancel')} disabled={pending}>
            {t('placements:actions.cancel')}
          </Button>
        )}

        {actions.includes('terminate') && (
          <Button variant="outline" onClick={() => setOpenCommand('terminate')} disabled={pending}>
            {t('placements:actions.terminate')}
          </Button>
        )}
      </div>

      {/*
        Cancel and terminate end a placement, so they ask for a written reason and an explicit
        second confirmation rather than firing on the first click.
      */}
      {openCommand && (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault()
            reasonMutation.mutate(openCommand)
          }}
        >
          <p className="text-sm text-foreground">{t(`placements:actions.confirm.${openCommand}`)}</p>

          <FormField
            className="mt-3"
            label={t('placements:actions.reasonLabel')}
            htmlFor="placement-reason"
          >
            <Textarea
              id="placement-reason"
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('placements:actions.reasonPlaceholder')}
            />
          </FormField>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              {t(`placements:actions.confirmButton.${openCommand}`)}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpenCommand(null)
                setReason('')
              }}
            >
              {t('placements:actions.dismiss')}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {apiErrorMessage(t, 'placements', 'actions', error)}
        </p>
      )}
    </section>
  )
}

/**
 * Which commands make sense from the current state. Mirrors the backend transition table, but is
 * presentation only — the server re-validates every transition.
 *
 * <p>COMPLETED is intentionally absent: completing an internship is gated on the Phase 6
 * requirement checks and has no endpoint yet, so offering the button would promise something the
 * API cannot honour.
 */
function availableActions(status: PlacementStatus): string[] {
  switch (status) {
    case 'PLANNED':
      return ['start', 'cancel']
    case 'ACTIVE':
      return ['requestCompletion', 'terminate']
    case 'COMPLETION_PENDING':
      return ['terminate']
    default:
      return []
  }
}
