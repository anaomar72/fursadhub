import type { OrganizationSummaryResponse } from '../../organization/types'

export type OpportunityMode = 'PUBLIC' | 'UNIVERSITY_TARGETED' | 'HYBRID'

export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'CANCELLED'

export type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE'

export type OpportunityTargetStatus = 'REQUESTED' | 'ACKNOWLEDGED' | 'NOMINATING' | 'COMPLETED' | 'DECLINED' | 'EXPIRED'

export interface OpportunityResponse {
  id: string
  organizationId: string
  title: string
  description: string
  responsibilities: string | null
  requirements: string | null
  mode: OpportunityMode
  numberOfOpenings: number
  workMode: WorkMode
  location: string | null
  startDate: string
  endDate: string
  applicationDeadline: string | null
  status: OpportunityStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OpportunityTargetResponse {
  id: string
  universityId: string
  departmentIds: string[]
  requestedNominees: number
  nominationDeadline: string
  status: OpportunityTargetStatus
  createdAt: string
}

export interface PublicOpportunityResponse {
  id: string
  organization: OrganizationSummaryResponse
  title: string
  description: string
  responsibilities: string | null
  requirements: string | null
  mode: OpportunityMode
  numberOfOpenings: number
  workMode: WorkMode
  location: string | null
  startDate: string
  endDate: string
  applicationDeadline: string | null
  publishedAt: string | null
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PublicOpportunityFilters {
  query?: string
  location?: string
  workMode?: WorkMode
  organization?: string
  page?: number
  size?: number
}
