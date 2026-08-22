import { apiFetch } from '../../../lib/api/client'
import type { PageResponse, PublicOpportunityFilters, PublicOpportunityResponse } from '../types'

export function listPublicOpportunities(filters: PublicOpportunityFilters) {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.location) params.set('location', filters.location)
  if (filters.workMode) params.set('workMode', filters.workMode)
  if (filters.organization) params.set('organization', filters.organization)
  params.set('page', String(filters.page ?? 0))
  params.set('size', String(filters.size ?? 12))

  return apiFetch<PageResponse<PublicOpportunityResponse>>(`/public/opportunities?${params.toString()}`, { method: 'GET' })
}

export function getPublicOpportunity(opportunityId: string) {
  return apiFetch<PublicOpportunityResponse>(`/public/opportunities/${opportunityId}`, { method: 'GET' })
}
