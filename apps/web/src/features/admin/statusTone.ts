import type { StatusTone } from '../../components/ui'
import type { InstitutionVerificationStatus, UserStatus } from './types'
import type { PrivacyRequestState } from '../privacy/types'

/**
 * Status → tone, in one place, so the same state never reads as "good" on one admin screen and
 * "bad" on another.
 *
 * <p>Tone is never the only signal: every {@code StatusBadge} that uses these also carries the
 * state's translated name, so the meaning survives colour blindness, greyscale printing and forced
 * -colours mode (BRAND_AND_UI_GUIDELINES.md section 9).
 */

/** The frozen account states of CLAUDE.md section 22. */
export const USER_STATUS_TONE: Record<UserStatus, StatusTone> = {
  PENDING_CONTACT_VERIFICATION: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  CLOSED: 'neutral',
}

/**
 * The frozen institution-verification states of CLAUDE.md section 31.
 *
 * <p>{@code SUBMITTED} and {@code UNDER_REVIEW} are `info` rather than `warning`: they are the
 * platform's own queue, normal and expected, not a problem. {@code NEEDS_CHANGES} is `warning`
 * because the ball is back with the institution.
 */
export const INSTITUTION_STATUS_TONE: Record<InstitutionVerificationStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_CHANGES: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'warning',
  REVOKED: 'danger',
}

/** The frozen data-subject-request states of CLAUDE.md section 50. */
export const PRIVACY_REQUEST_TONE: Record<PrivacyRequestState, StatusTone> = {
  SUBMITTED: 'info',
  IN_REVIEW: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
}

/**
 * The student-verification states of CLAUDE.md section 30, as seen from the escalation queue.
 *
 * <p>Typed loosely because {@code EscalatedCaseResponse.status} is a plain string on the wire; an
 * unrecognised state falls back to neutral rather than throwing, so a state added to the machine
 * later shows up uncoloured instead of breaking the queue.
 */
const CASE_TONES: Record<string, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

export function caseStatusTone(status: string): StatusTone {
  return CASE_TONES[status] ?? 'neutral'
}

/**
 * Tone for any status appearing in a dashboard breakdown, across every state machine the
 * statistics endpoint groups by — accounts, organizations, opportunities and placements.
 *
 * <p>The endpoint returns whatever enum values PostgreSQL actually holds, so this is a lookup with
 * a neutral fallback rather than an exhaustive record: a state added to a machine later shows up
 * uncoloured instead of crashing the dashboard.
 */
const DISTRIBUTION_TONES: Record<string, StatusTone> = {
  ...USER_STATUS_TONE,
  ...INSTITUTION_STATUS_TONE,
  // Opportunity states (CLAUDE.md section 33).
  PUBLISHED: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
  // Placement states (CLAUDE.md section 39).
  PLANNED: 'info',
  ACTIVE: 'success',
  COMPLETION_PENDING: 'warning',
  COMPLETED: 'success',
  TERMINATED: 'danger',
}

export function distributionTone(status: string): StatusTone {
  return DISTRIBUTION_TONES[status] ?? 'neutral'
}
