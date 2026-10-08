import type { StatusTone } from '../../components/ui'
import {
  ACCOUNT_STATUS_TONE,
  ENROLLMENT_VERIFICATION_TONE,
  INSTITUTION_VERIFICATION_TONE,
  OPPORTUNITY_STATUS_TONE,
  PLACEMENT_STATUS_TONE,
  PRIVACY_REQUEST_TONE as SHARED_PRIVACY_REQUEST_TONE,
  TESTIMONIAL_STATUS_TONE as SHARED_TESTIMONIAL_STATUS_TONE,
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
export const TESTIMONIAL_STATUS_TONE = SHARED_TESTIMONIAL_STATUS_TONE

/** Student-verification states as seen from the escalation queue (a plain string on the wire). */
export function caseStatusTone(status: string): StatusTone {
  return toneOf(ENROLLMENT_VERIFICATION_TONE, status)
}

/**
 * The state machines the statistics endpoint groups by, each with its OWN tones.
 *
 * <p>Phase 8 fix: these used to be merged into one lookup, so a key two machines share took
 * whichever tone was spread last — placement CANCELLED (never started, neutral) read as danger
 * because opportunity CANCELLED is. Each breakdown now resolves against its own machine.
 */
export type StatisticMachine = 'accounts' | 'institutions' | 'enrollments' | 'opportunities' | 'placements'

const STATISTIC_TONES: Record<StatisticMachine, Record<string, StatusTone>> = {
  accounts: ACCOUNT_STATUS_TONE,
  institutions: INSTITUTION_VERIFICATION_TONE,
  enrollments: ENROLLMENT_VERIFICATION_TONE,
  opportunities: OPPORTUNITY_STATUS_TONE,
  placements: PLACEMENT_STATUS_TONE,
}

/** A neutral fallback, so a state added to a machine later shows uncoloured instead of crashing. */
export function statisticTone(machine: StatisticMachine, status: string): StatusTone {
  return toneOf(STATISTIC_TONES[machine], status)
}
