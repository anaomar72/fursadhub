/** Phase 5 placement contracts. Mirrors the backend DTOs exactly (CLAUDE.md section 10/11). */

/**
 * The frozen placement states (CLAUDE.md section 39). CANCELLED means the placement never properly
 * started; TERMINATED means it started and then ended early. They are not interchangeable, and the
 * UI must never present them as one "ended" state.
 */
export type PlacementStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'COMPLETION_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'TERMINATED'

export type SupervisorType = 'UNIVERSITY' | 'ORGANIZATION'

/**
 * One supervisor assignment period. `active === false` with a populated `removedAt` is a preserved
 * history row, not a deletion — reassignment closes a period rather than overwriting it
 * (CLAUDE.md section 40).
 */
export interface SupervisorAssignmentResponse {
  id: string
  supervisorUserId: string
  supervisorEmail: string | null
  type: SupervisorType
  assignedAt: string
  removedAt: string | null
  active: boolean
}

/**
 * A placement as every area renders it. `universityId`/`departmentId` are the placement's OWN
 * historical academic context, not a live lookup through the student's current enrollment, so this
 * keeps reading correctly after the student's profile changes.
 */
export interface PlacementResponse {
  id: string
  candidacyId: string
  opportunityId: string
  opportunityTitle: string | null
  organizationId: string
  organizationName: string | null
  universityId: string
  universityName: string | null
  departmentId: string
  departmentName: string | null
  studentUserId: string
  studentFullName: string | null
  studentEmail: string | null
  startDate: string
  endDate: string
  location: string | null
  status: PlacementStatus
  startedAt: string | null
  completionRequestedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  terminatedAt: string | null
  cancellationReason: string | null
  terminationReason: string | null
  universitySupervisor: SupervisorAssignmentResponse | null
  organizationSupervisor: SupervisorAssignmentResponse | null
  createdAt: string
  updatedAt: string
}

/** A staff member the picker may offer. The backend re-validates the choice on submit regardless. */
export interface EligibleSupervisorResponse {
  userId: string
  email: string | null
}
