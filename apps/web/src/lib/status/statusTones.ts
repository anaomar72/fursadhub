import type { StatusTone } from '../../components/ui/StatusBadge'

/**
 * THE status → tone registry for lifecycle states that more than one feature displays.
 *
 * <p><strong>Why it exists.</strong> At the Phase 1 audit about twenty feature files each carried a
 * private copy of a status map, and the copies had already disagreed: an institution's `SUSPENDED`
 * was `warning` on the admin screens and `danger` on the institution's own profile, and a privacy
 * request `IN_REVIEW` was `info` for the admin and `warning` for the student who filed it. The same
 * state must read the same way to everyone who sees it.
 *
 * <p><strong>The rule for tones</strong> (every badge also carries the translated state name, so
 * tone is never the only signal):
 * <ul>
 *   <li>`success` — done and good: VERIFIED, ACTIVE, COMPLETED, ACCEPTED, APPROVED.</li>
 *   <li>`info` — in progress, normal, nobody is blocked: SUBMITTED, UNDER_REVIEW, IN_REVIEW.</li>
 *   <li>`warning` — someone must act: PENDING_*, NEEDS_*, RETURNED.</li>
 *   <li>`danger` — stopped by a decision: REJECTED, REVOKED, SUSPENDED, TERMINATED.</li>
 *   <li>`neutral` — inert or finished without judgement: DRAFT, CLOSED, WITHDRAWN, EXPIRED.</li>
 * </ul>
 *
 * <p><strong>Scope.</strong> Cross-feature machines live here. A machine owned by one feature keeps
 * its map in that feature (`features/recruitment/components/statusTone.ts` and friends), following
 * the same rule. The state lists are the frozen ones in CLAUDE.md; the unions are declared here so
 * `lib` never imports from `features`, and the feature unions are structurally identical.
 */

/** Account states — CLAUDE.md section 22. */
export type AccountStatus = 'PENDING_CONTACT_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export const ACCOUNT_STATUS_TONE: Record<AccountStatus, StatusTone> = {
  PENDING_CONTACT_VERIFICATION: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  CLOSED: 'neutral',
}

/** University / organization verification states — CLAUDE.md section 31. */
export type InstitutionVerificationState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_CHANGES'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED'

export const INSTITUTION_VERIFICATION_TONE: Record<InstitutionVerificationState, StatusTone> = {
  DRAFT: 'neutral',
  // The platform's own queue: normal and expected, not a problem.
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  // The ball is back with the institution.
  NEEDS_CHANGES: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  // A decision that stops the institution operating — the same weight as a revocation.
  SUSPENDED: 'danger',
  REVOKED: 'danger',
}

/** Student enrollment verification states — CLAUDE.md section 30. */
export type EnrollmentVerificationState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_MORE_EVIDENCE'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REVOKED'

export const ENROLLMENT_VERIFICATION_TONE: Record<EnrollmentVerificationState, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

/** Data-subject request states — CLAUDE.md section 50. */
export type PrivacyRequestStatus = 'SUBMITTED' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED'

export const PRIVACY_REQUEST_TONE: Record<PrivacyRequestStatus, StatusTone> = {
  SUBMITTED: 'info',
  // Being worked on by the platform — normal, and nothing for the requester to do.
  IN_REVIEW: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
}

/**
 * Tone for a status that arrives as a plain string on the wire. An unrecognised value — a state
 * added to a machine later — renders neutral instead of throwing.
 */
export function toneOf<S extends string>(map: Record<S, StatusTone>, status: string | null | undefined): StatusTone {
  return (status && (map as Record<string, StatusTone>)[status]) || 'neutral'
}
