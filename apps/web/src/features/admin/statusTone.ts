import type { StatusTone } from '../../components/ui'
import {
  ACCOUNT_STATUS_TONE,
  ENROLLMENT_VERIFICATION_TONE,
  INSTITUTION_VERIFICATION_TONE,
  PRIVACY_REQUEST_TONE as SHARED_PRIVACY_REQUEST_TONE,
  toneOf,
} from '../../lib/status/statusTones'

/**
 * Status → tone, in one place, so the same state never reads as "good" on one admin screen and
 * "bad" on another.
 *
 * <p>Tone is never the only signal: every {@code StatusBadge} that uses these also carries the
 * state's translated name, so the meaning survives colour blindness, greyscale printing and forced
 * -colours mode (WCAG 1.4.1).
 */

/**
 * The cross-feature machines resolve through the shared registry (lib/status/statusTones), so an
 * admin screen and the institution's own screen can never disagree about a state again — they did:
 * institution SUSPENDED was `warning` here and `danger` on the profile pages.
 */
export const USER_STATUS_TONE = ACCOUNT_STATUS_TONE
export const INSTITUTION_STATUS_TONE = INSTITUTION_VERIFICATION_TONE
export const PRIVACY_REQUEST_TONE = SHARED_PRIVACY_REQUEST_TONE

/** Student-verification states as seen from the escalation queue (a plain string on the wire). */
export function caseStatusTone(status: string): StatusTone {
  return toneOf(ENROLLMENT_VERIFICATION_TONE, status)
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
