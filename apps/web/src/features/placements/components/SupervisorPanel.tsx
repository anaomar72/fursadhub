import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as placementsApi from '../api/placementsApi'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Select } from '../../../components/ui'
import type { PlacementResponse, SupervisorAssignmentResponse, SupervisorType } from '../types'

interface SupervisorPanelProps {
  placement: PlacementResponse
  type: SupervisorType
  /** Whether this viewer may change the assignment. UX only — the backend re-checks every call. */
  canAssign: boolean
}

/**
 * The current holder of one supervisor post, plus the picker to (re)assign it.
 *
 * <p>The picker is a convenience only. The chosen id is re-validated by the backend against the
 * placement's own university/organization on submit, so a caller who bypasses this list gains
 * nothing (CLAUDE.md section 12/24).
 *
 * <p>Reassigning is presented as a handover rather than an edit, because that is what the backend
 * does: the outgoing supervisor's period is closed and preserved, never overwritten
 * (CLAUDE.md section 40).
 */
export function SupervisorPanel({ placement, type, canAssign }: SupervisorPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')

  const current: SupervisorAssignmentResponse | null =
    type === 'UNIVERSITY' ? placement.universitySupervisor : placement.organizationSupervisor

  const eligibleQuery = useQuery({
    queryKey: ['placements', 'eligible-supervisors', placement.id, type],
    queryFn: () =>
      type === 'UNIVERSITY'
        ? placementsApi.listEligibleUniversitySupervisors(placement.id)
        : placementsApi.listEligibleOrganizationSupervisors(placement.id),
    enabled: canAssign,
    retry: false,
  })

  const assignMutation = useMutation({
    mutationFn: (supervisorUserId: string) =>
      type === 'UNIVERSITY'
        ? placementsApi.assignUniversitySupervisor(placement.id, supervisorUserId)
        : placementsApi.assignOrganizationSupervisor(placement.id, supervisorUserId),
    onSuccess: () => {
      setSelectedUserId('')
      queryClient.invalidateQueries({ queryKey: ['placements'] })
    },
  })

  const eligible = eligibleQuery.data ?? []
  const titleKey = type === 'UNIVERSITY' ? 'universitySupervisor' : 'organizationSupervisor'

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{t(`placements:supervisors.${titleKey}`)}</h2>

      {current ? (
        <p className="mt-2 text-sm text-foreground">
          {current.supervisorEmail ?? current.supervisorUserId}
          <span className="block text-xs text-foreground-secondary">
            {t('placements:supervisors.assignedSince', { date: formatDate(current.assignedAt) })}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-foreground-secondary">{t('placements:supervisors.unassigned')}</p>
      )}

      {canAssign && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (selectedUserId) {
              assignMutation.mutate(selectedUserId)
            }
          }}
        >
          <FormField
            className="min-w-56 flex-1"
            label={t(
              current ? 'placements:supervisors.reassignLabel' : 'placements:supervisors.assignLabel',
            )}
            htmlFor={`supervisor-${type}`}
          >
            <Select
              id={`supervisor-${type}`}
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              <option value="">{t('placements:supervisors.choosePlaceholder')}</option>
              {eligible
                .filter((candidate) => candidate.userId !== current?.supervisorUserId)
                .map((candidate) => (
                  <option key={candidate.userId} value={candidate.userId}>
                    {candidate.email ?? candidate.userId}
                  </option>
                ))}
            </Select>
          </FormField>

          <Button type="submit" disabled={!selectedUserId || assignMutation.isPending}>
            {t(current ? 'placements:supervisors.reassign' : 'placements:supervisors.assign')}
          </Button>
        </form>
      )}

      {canAssign && !eligibleQuery.isLoading && eligible.length === 0 && (
        <p className="mt-3 text-xs text-foreground-secondary">
          {t(`placements:supervisors.noneEligible.${type}`)}
        </p>
      )}

      {assignMutation.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {apiErrorMessage(t, 'placements', 'supervisors', assignMutation.error)}
        </p>
      )}
    </section>
  )
}

function formatDate(value: string): string {
  return value.slice(0, 10)
}
