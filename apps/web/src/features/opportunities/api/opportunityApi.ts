import { apiFetch } from '../../../lib/api/client'
import type { MessageResponse } from '../../auth/types'
import type {
  CompensationInput,
  OpportunityMode,
  OpportunityResponse,
  OpportunityTargetResponse,
  WorkMode,
} from '../types'

/**
 * The opportunity create/edit payload.
 *
 * The Backend Phase B3 fields are optional here on purpose, and it is SAFE to omit them: the
 * update endpoint treats an omitted B3 field as "leave the stored value alone" and only clears one
 * on an explicit `null` (or `[]` for a list). That is why the current form — which sends only the
 * original eleven fields — cannot erase an opportunity's compensation, skills, perks or hours.
 *
 * The eleven original fields keep FULL REPLACEMENT: omitting `responsibilities`, `requirements`,
 * `location` or `applicationDeadline` still CLEARS them, so a form editing those must submit every
 * one it wants kept.
 */
export interface OpportunityFormInput {
  title: string
  description: string
  responsibilities?: string
  requirements?: string
  mode: OpportunityMode
  numberOfOpenings: number
  workMode: WorkMode
  location?: string
  startDate: string
  endDate: string
  applicationDeadline?: string
  /** Backend Phase B3 — omit to preserve, `null` to clear. */
  compensation?: CompensationInput | null
  /** Omit to preserve; `[]` clears the list. */
  skills?: string[]
  perks?: string[]
  hoursPerWeek?: number | null
}

export function listOrganizationOpportunities(organizationId: string) {
  return apiFetch<OpportunityResponse[]>(`/organizations/${organizationId}/opportunities`, { method: 'GET' })
}

export function createOpportunity(organizationId: string, input: OpportunityFormInput) {
  return apiFetch<OpportunityResponse>(`/organizations/${organizationId}/opportunities`, { method: 'POST', body: input })
}

export function getOpportunity(opportunityId: string) {
  return apiFetch<OpportunityResponse>(`/opportunities/${opportunityId}`, { method: 'GET' })
}

export function updateOpportunity(opportunityId: string, input: OpportunityFormInput) {
  return apiFetch<OpportunityResponse>(`/opportunities/${opportunityId}`, { method: 'PATCH', body: input })
}

export function publishOpportunity(opportunityId: string) {
  return apiFetch<OpportunityResponse>(`/opportunities/${opportunityId}/publish`, { method: 'POST' })
}

export function pauseOpportunity(opportunityId: string) {
  return apiFetch<OpportunityResponse>(`/opportunities/${opportunityId}/pause`, { method: 'POST' })
}

export function resumeOpportunity(opportunityId: string) {
  return apiFetch<OpportunityResponse>(`/opportunities/${opportunityId}/resume`, { method: 'POST' })
}

export function closeOpportunity(opportunityId: string) {
  return apiFetch<OpportunityResponse>(`/opportunities/${opportunityId}/close`, { method: 'POST' })
}

export function cancelOpportunity(opportunityId: string) {
  return apiFetch<OpportunityResponse>(`/opportunities/${opportunityId}/cancel`, { method: 'POST' })
}

export function listTargets(opportunityId: string) {
  return apiFetch<OpportunityTargetResponse[]>(`/opportunities/${opportunityId}/targets`, { method: 'GET' })
}

export function addTarget(
  opportunityId: string,
  input: { universityId: string; departmentIds: string[]; requestedNominees: number; nominationDeadline: string },
) {
  return apiFetch<OpportunityTargetResponse>(`/opportunities/${opportunityId}/targets`, { method: 'POST', body: input })
}

export function removeTarget(opportunityId: string, targetId: string) {
  return apiFetch<MessageResponse>(`/opportunities/${opportunityId}/targets/${targetId}`, { method: 'DELETE' })
}
