/** Phase 6 weekly-log contracts. Mirrors the backend DTOs exactly (CLAUDE.md section 10/11). */

/**
 * The frozen weekly-log states (CLAUDE.md section 42).
 *
 * RETURNED_FOR_CHANGES is back with the student; SUBMITTED is with the supervisor; REVIEWED is
 * finished and is the state that counts towards completion. The UI must never merge them.
 */
export type WeeklyLogState = 'DRAFT' | 'SUBMITTED' | 'RETURNED_FOR_CHANGES' | 'REVIEWED'

export interface WeeklyLogResponse {
  id: string
  placementId: string
  weekNumber: number
  periodStart: string
  periodEnd: string
  summary: string
  activities: string | null
  challenges: string | null
  learningOutcomes: string | null
  state: WeeklyLogState
  submittedAt: string | null
  reviewedAt: string | null
  reviewComment: string | null
  /** Whether the STUDENT may still edit it. Staff screens ignore this. */
  editable: boolean
  createdAt: string
  updatedAt: string
}

export interface WeeklyLogInput {
  summary: string
  activities?: string
  challenges?: string
  learningOutcomes?: string
}
