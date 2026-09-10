import type { OrganizationSummaryResponse } from '../../organization/types'

export type OpportunityMode = 'PUBLIC' | 'UNIVERSITY_TARGETED' | 'HYBRID'

export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'CANCELLED'

export type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE'

export type OpportunityTargetStatus = 'REQUESTED' | 'ACKNOWLEDGED' | 'NOMINATING' | 'COMPLETED' | 'DECLINED' | 'EXPIRED'

/** How an internship is compensated (Backend Phase B3). */
export type CompensationType = 'UNPAID' | 'FIXED' | 'RANGE' | 'NEGOTIABLE'

/** The unit an amount is quoted in; TOTAL means "for the whole internship". */
export type CompensationPeriod = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'TOTAL'

/**
 * Structured compensation (Backend Phase B3) — never a pre-rendered display string, because the
 * listing is bilingual and formatting is a rendering concern.
 *
 * The SINGLE amount of a `FIXED` compensation lives in `minimumAmount`, with `maximumAmount` null;
 * only a `RANGE` carries both. Amounts arrive as strings, not numbers: they are `NUMERIC(12,2)`
 * server-side, and parsing them into a JS `number` would reintroduce the binary rounding error the
 * backend deliberately avoids. Format them as strings, or parse with a decimal library.
 */
export interface CompensationResponse {
  type: CompensationType
  currencyCode?: string | null
  minimumAmount?: string | null
  maximumAmount?: string | null
  period?: CompensationPeriod | null
}

/** What a client may submit as compensation. Cross-field rules are enforced by the backend. */
export interface CompensationInput {
  type: CompensationType
  currencyCode?: string | null
  minimumAmount?: string | number | null
  maximumAmount?: string | number | null
  period?: CompensationPeriod | null
}

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
  /**
   * Backend Phase B3, additive. `compensation` and `hoursPerWeek` are ABSENT (not null) when unset,
   * under the API's `non_null` serialization; `skills` and `perks` are always present and may be `[]`.
   *
   * Update semantics on `PATCH /opportunities/{id}` differ by field age, deliberately:
   * - these four B3 fields are PRESENCE-AWARE — omit one and the stored value is kept. Send `null`
   *   (or `[]` for a list) to clear it. A form that does not know about a field cannot destroy it.
   * - the eleven older fields keep FULL REPLACEMENT — omitting `responsibilities`, `requirements`,
   *   `location` or `applicationDeadline` still CLEARS them.
   */
  compensation?: CompensationResponse | null
  skills: string[]
  perks: string[]
  hoursPerWeek?: number | null
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
  /** Backend Phase B3, additive — see OpportunityResponse for the absent-vs-null note. */
  compensation?: CompensationResponse | null
  skills: string[]
  perks: string[]
  hoursPerWeek?: number | null
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
