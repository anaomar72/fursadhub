import { apiFetch } from '../../../lib/api/client'
import type { EvaluationDraftInput, EvaluationResponse } from '../types'

/**
 * The backend returns 204 while there is nothing this caller may see — a student asking during
 * drafting, for example — so the client models "no evaluation yet" as null rather than an error.
 */
export function getEvaluation(placementId: string) {
  return apiFetch<EvaluationResponse | undefined>(`/placements/${placementId}/evaluation`, {
    method: 'GET',
  }).then((evaluation) => evaluation ?? null)
}

export function saveEvaluationDraft(placementId: string, input: EvaluationDraftInput) {
  return apiFetch<EvaluationResponse>(`/placements/${placementId}/evaluation`, {
    method: 'PUT',
    body: input,
  })
}

export function submitEvaluation(placementId: string) {
  return apiFetch<EvaluationResponse>(`/placements/${placementId}/evaluation/submit`, { method: 'POST' })
}

export function finalizeEvaluation(placementId: string) {
  return apiFetch<EvaluationResponse>(`/placements/${placementId}/evaluation/finalize`, { method: 'POST' })
}
