/** Phase 6 defense contracts (CLAUDE.md section 46). */

export type DefenseAttemptState = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

/** Only PASSED satisfies the completion requirement. */
export type DefenseResult = 'PASSED' | 'FAILED' | 'RETAKE_REQUIRED'

/**
 * One preserved attempt. A retake is a NEW attempt, so the history array always keeps every previous
 * one — the UI must render them all rather than showing only the latest.
 */
export interface DefenseAttemptResponse {
  id: string
  placementId: string
  attemptNumber: number
  scheduledAt: string
  locationDetails: string | null
  state: DefenseAttemptState
  result: DefenseResult | null
  panelNotes: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
}
