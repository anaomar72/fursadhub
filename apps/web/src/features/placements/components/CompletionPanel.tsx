import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AnimatedCheck, Button, Skeleton } from '../../../components/ui'
import { ApiError } from '../../../lib/api/client'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as placementsApi from '../api/placementsApi'
import { CompletionChecklist } from './CompletionChecklist'
import type { PlacementResponse } from '../types'

interface CompletionPanelProps {
  placement: PlacementResponse
  /**
   * Whether to offer the completion action. Only university staff with standing authority have it;
   * everyone else sees the checklist alone. The backend refuses the call regardless of what is
   * rendered (CLAUDE.md section 24).
   */
  canComplete: boolean
}

/**
 * The completion checklist plus, for authorized university staff, the action itself.
 *
 * <p>Every requirement shown here comes from the backend — this component never inspects the policy
 * or counts weekly logs itself. When completion is refused, each outstanding requirement is read
 * from the error's {@code fieldErrors} by its stable CODE and translated locally, so the UI never
 * depends on the English message (CLAUDE.md section 11).
 */
export function CompletionPanel({ placement, canComplete }: CompletionPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [unmetCodes, setUnmetCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)

  const statusQuery = useQuery({
    queryKey: ['placement-completion', placement.id],
    queryFn: () => placementsApi.getCompletionStatus(placement.id),
  })

  const completeMutation = useMutation({
    mutationFn: () => placementsApi.completePlacement(placement.id),
    onSuccess: () => {
      setUnmetCodes([])
      setError(null)
      // A one-time confirmation, then the stable COMPLETED state remains
      // (BRAND_AND_UI_GUIDELINES.md section 14). It is never replayed on re-render.
      setJustCompleted(true)
      void queryClient.invalidateQueries({ queryKey: ['placements'] })
      void queryClient.invalidateQueries({ queryKey: ['placement-completion', placement.id] })
    },
    onError: (cause) => {
      if (cause instanceof ApiError && cause.body.code === 'PLACEMENT_COMPLETION_REQUIREMENTS_NOT_MET') {
        setUnmetCodes(cause.body.fieldErrors.map((fieldError) => fieldError.code))
        setError(null)
        void queryClient.invalidateQueries({ queryKey: ['placement-completion', placement.id] })
        return
      }
      setUnmetCodes([])
      setError(apiErrorMessage(t, 'internship', 'completion', cause))
    },
  })

  if (statusQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />
  }

  const status = statusQuery.data
  if (!status) {
    return null
  }

  const showAction = canComplete && placement.status === 'COMPLETION_PENDING'

  return (
    <CompletionChecklist status={status}>
      {placement.status === 'COMPLETED' && justCompleted ? (
        <div className="flex justify-center py-2">
          <AnimatedCheck label={t('internship:completion.completedConfirmation')} />
        </div>
      ) : null}

      {placement.status === 'COMPLETED' && !justCompleted && (
        <p className="text-sm text-success">{t('internship:completion.alreadyComplete')}</p>
      )}

      {showAction && (
        <div className="flex flex-col gap-2">
          <Button
            loading={completeMutation.isPending}
            disabled={!status.canComplete}
            onClick={() => completeMutation.mutate()}
          >
            {t('internship:completion.actions.complete')}
          </Button>
          {!status.canComplete && (
            <p className="text-xs text-foreground-secondary">
              {t('internship:completion.blockedHint')}
            </p>
          )}
        </div>
      )}

      {unmetCodes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning" role="alert">
          {unmetCodes.map((code) => (
            <li key={code}>{t(`internship:completion.errors.${code}`)}</li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </CompletionChecklist>
  )
}
