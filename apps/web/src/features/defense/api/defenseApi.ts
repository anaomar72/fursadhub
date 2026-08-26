import { apiFetch } from '../../../lib/api/client'
import type { DefenseAttemptResponse, DefenseResult } from '../types'

/** Every attempt, oldest first — cancelled and failed ones included. */
export function listDefenseAttempts(placementId: string) {
  return apiFetch<DefenseAttemptResponse[]>(`/placements/${placementId}/defense-attempts`, {
    method: 'GET',
  })
}

/** A retake is simply another POST here; the attempt number is assigned by the backend. */
export function scheduleDefense(placementId: string, scheduledAt: string, locationDetails?: string) {
  return apiFetch<DefenseAttemptResponse>(`/placements/${placementId}/defense-attempts`, {
    method: 'POST',
    body: { scheduledAt, locationDetails: locationDetails ?? null },
  })
}

export function cancelDefenseAttempt(attemptId: string) {
  return apiFetch<DefenseAttemptResponse>(`/defense-attempts/${attemptId}/cancel`, { method: 'POST' })
}

export function recordDefenseResult(attemptId: string, result: DefenseResult, panelNotes?: string) {
  return apiFetch<DefenseAttemptResponse>(`/defense-attempts/${attemptId}/result`, {
    method: 'POST',
    body: { result, panelNotes: panelNotes ?? null },
  })
}
