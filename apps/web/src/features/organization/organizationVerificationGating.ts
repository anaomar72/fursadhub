import type { InstitutionVerificationStatus } from './types'

/**
 * The single status at which FursadHub treats an organization as able to take on new candidates.
 *
 * <p>Mirrors `PublicOpportunityVisibility.REQUIRED_ORGANIZATION_STATUS`, which both halves of the
 * Backend Phase B1.5 invariant are written against — the SQL predicate that decides what is publicly
 * visible, and `OrganizationVerificationGuard`, which decides what may be done.
 */
export const VERIFIED_STATUS: InstitutionVerificationStatus = 'VERIFIED'

export function isOrganizationVerified(status: InstitutionVerificationStatus | undefined | null): boolean {
  return status === VERIFIED_STATUS
}

/**
 * Whether an unverified organization can still submit for review, and therefore whether the gating
 * message should point at "submit for verification" or at "wait for the review to finish".
 *
 * <p>These are exactly the two statuses `ProfilePage` already allows the submit command from —
 * `UpdateOrganizationService`'s submit path accepts DRAFT and NEEDS_CHANGES and refuses the rest.
 */
export function canSubmitForVerification(status: InstitutionVerificationStatus): boolean {
  return status === 'DRAFT' || status === 'NEEDS_CHANGES'
}

/**
 * The organization actions that can legitimately fail with `ORGANIZATION_NOT_VERIFIED`.
 *
 * <p>This list is derived from the call sites of `OrganizationVerificationGuard`, not guessed. On
 * the organization's OWN side there are exactly two — `requireVerifiedForOwnAction` is called from
 * `OpportunityStateTransitionService.publish` and `.resume`, and nowhere else.
 *
 * <p>The guard's other entry point, `requireVerifiedForCandidateIntake`, is called from application
 * submission, nomination and nomination consent — all of which are performed by a STUDENT or a
 * UNIVERSITY, never by this organization's staff. So there is nothing to gate for them in this
 * portal, and gating anything more here would disable controls the backend would have accepted.
 *
 * <p>Creating and editing a draft, adding targets, authoring screening questions, managing
 * candidates on an already-published internship, running placements and provisioning staff are all
 * unaffected by verification status and are deliberately NOT gated.
 */
export const VERIFICATION_GATED_ACTIONS = ['publish', 'resume'] as const

export type VerificationGatedAction = (typeof VERIFICATION_GATED_ACTIONS)[number]
