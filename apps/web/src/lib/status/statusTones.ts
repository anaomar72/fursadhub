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

// ---------------------------------------------------------------- recruitment and placement
// Read by the student workspace as well as by the recruitment and placement areas (dashboard,
// applications, nominations, internship hub), so they are cross-feature machines and live here.

/** Candidacy states — CLAUDE.md section 37. */
export type CandidacyStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFERED'
  | 'OFFER_DECLINED'
  | 'OFFER_EXPIRED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'

export const CANDIDACY_STATUS_TONE: Record<CandidacyStatus, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  SHORTLISTED: 'info',
  INTERVIEW: 'info',
  OFFERED: 'warning',
  OFFER_DECLINED: 'neutral',
  OFFER_EXPIRED: 'neutral',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
}

/** Nomination states — CLAUDE.md section 35. */
export type NominationStatus = 'PENDING_STUDENT_CONSENT' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'

export const NOMINATION_STATUS_TONE: Record<NominationStatus, StatusTone> = {
  PENDING_STUDENT_CONSENT: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  WITHDRAWN: 'neutral',
}

/** Offer states — CLAUDE.md section 38. */
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN'

export const OFFER_STATUS_TONE: Record<OfferStatus, StatusTone> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  EXPIRED: 'neutral',
  WITHDRAWN: 'neutral',
}

/** Placement states — CLAUDE.md section 39. */
export type PlacementStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETION_PENDING' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED'

export const PLACEMENT_STATUS_TONE: Record<PlacementStatus, StatusTone> = {
  PLANNED: 'info',
  ACTIVE: 'success',
  COMPLETION_PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  TERMINATED: 'danger',
}

// ---------------------------------------------------------------- opportunities
// Read by the organization workspace, the university's target requests and the public/student
// listings, so they are cross-feature machines too.

/** Opportunity states — CLAUDE.md section 33. */
export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'CANCELLED'

export const OPPORTUNITY_STATUS_TONE: Record<OpportunityStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
}

/** Opportunity target states — CLAUDE.md section 34. */
export type OpportunityTargetStatus = 'REQUESTED' | 'ACKNOWLEDGED' | 'NOMINATING' | 'COMPLETED' | 'DECLINED' | 'EXPIRED'

export const OPPORTUNITY_TARGET_STATUS_TONE: Record<OpportunityTargetStatus, StatusTone> = {
  REQUESTED: 'info',
  ACKNOWLEDGED: 'info',
  NOMINATING: 'warning',
  COMPLETED: 'success',
  DECLINED: 'neutral',
  EXPIRED: 'neutral',
}

/**
 * Tone for a status that arrives as a plain string on the wire. An unrecognised value — a state
 * added to a machine later — renders neutral instead of throwing.
 */
export function toneOf<S extends string>(map: Record<S, StatusTone>, status: string | null | undefined): StatusTone {
  return (status && (map as Record<string, StatusTone>)[status]) || 'neutral'
}
