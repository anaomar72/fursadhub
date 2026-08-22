import { apiFetch } from '../../../lib/api/client'
import type { MessageResponse } from '../../auth/types'
import type { OpportunityMode, OpportunityResponse, OpportunityTargetResponse, WorkMode } from '../types'

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
