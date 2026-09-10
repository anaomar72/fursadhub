import type { InstitutionVerificationStatus } from './types'

/** The six verification commands, each its own endpoint (CLAUDE.md section 10). */
export type InstitutionAction =
  | 'begin-review'
  | 'verify'
  | 'request-changes'
  | 'reject'
  | 'suspend'
  | 'revoke'

/**
 * Which commands are offered from each state.
 *
 * <p>A convenience only. The frozen state machine lives on the backend's {@code Organization} and
 * {@code University} entities and refuses anything invalid regardless of what this map says — hiding
 * a button that would fail is politeness, not enforcement (CLAUDE.md section 24). Both entities run
 * the same machine, which is why one map serves both queues.
 */
export const INSTITUTION_ACTIONS: Record<InstitutionVerificationStatus, InstitutionAction[]> = {
  DRAFT: [],
  SUBMITTED: ['begin-review', 'verify', 'reject'],
  UNDER_REVIEW: ['verify', 'request-changes', 'reject'],
  NEEDS_CHANGES: [],
  VERIFIED: ['suspend', 'revoke'],
  REJECTED: [],
  SUSPENDED: ['revoke'],
  REVOKED: [],
}

/**
 * Commands that must carry a reason.
 *
 * <p>Every one of these tells the institution that something is wrong or has been taken away, and
 * the note is what they are given to act on. Approving needs no explanation; refusing always does.
 */
export const INSTITUTION_ACTION_NEEDS_NOTE = new Set<InstitutionAction>([
  'request-changes',
  'reject',
  'suspend',
  'revoke',
])

/** Actions that take something away — styled as destructive and confirmed before they run. */
export const INSTITUTION_ACTION_DESTRUCTIVE = new Set<InstitutionAction>([
  'reject',
  'suspend',
  'revoke',
])

/** The statuses worth offering as a queue filter. DRAFT is excluded: it has never been submitted. */
export const INSTITUTION_FILTER_STATUSES: InstitutionVerificationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_CHANGES',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED',
  'REVOKED',
]

/** The two states where the ball is on the platform's side of the net. */
export function awaitingReview(status: InstitutionVerificationStatus): boolean {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW'
}
