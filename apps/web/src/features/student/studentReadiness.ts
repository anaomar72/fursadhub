import type { StudentEnrollmentResponse, StudentProfileResponse } from './types'
import type { PlacementResponse } from '../placements/types'
import type { OpportunityMode } from '../opportunities/types'
import type { StudentCandidacyResponse } from '../recruitment/types'

/**
 * Client-side mirrors of the backend's real participation rules, for DISPLAY ONLY.
 *
 * <p>Every rule here has exactly one authority — the API — and these helpers exist so the student
 * sees why an action is unavailable before spending a request on it, never to decide anything. The
 * backend re-checks all of it and answers with the stable codes below regardless of what the UI
 * rendered (CLAUDE.md sections 11, 24).
 *
 * <p>Sources: {@code StudentEligibility} (STUDENT_NOT_VERIFIED, STUDENT_NOT_AVAILABLE),
 * {@code OpportunityApplicationRules} (OPPORTUNITY_NOT_PUBLIC, OPPORTUNITY_DEADLINE_PASSED) and
 * {@code SubmitApplicationService} (STUDENT_ALREADY_APPLIED).
 */

/** Placement statuses that hold a student's one live placement slot (mirrors `existsLiveByStudentUserId`). */
const LIVE_PLACEMENT_STATUSES = new Set(['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'])

/** Candidacy statuses that still count as being in a pipeline. */
export const ACTIVE_CANDIDACY_STATUSES = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
])

export type ApplyBlocker =
  | 'STUDENT_NOT_VERIFIED'
  | 'STUDENT_NOT_AVAILABLE'
  | 'STUDENT_ALREADY_APPLIED'
  | 'OPPORTUNITY_NOT_PUBLIC'
  | 'OPPORTUNITY_DEADLINE_PASSED'

export interface ApplyEligibilityInput {
  enrollment: StudentEnrollmentResponse | null
  placements: PlacementResponse[]
  candidacies: StudentCandidacyResponse[]
  opportunity: { id: string; mode: OpportunityMode; applicationDeadline: string | null }
  /** Injectable for tests; defaults to today. */
  today?: Date
}

/**
 * The first blocker that would stop this student applying, or `null` when nothing visible does.
 * Ordered the way the backend evaluates them so the message matches the error they would get.
 */
export function applyBlocker({
  enrollment,
  placements,
  candidacies,
  opportunity,
  today = new Date(),
}: ApplyEligibilityInput): ApplyBlocker | null {
  if (enrollment?.verificationStatus !== 'VERIFIED') return 'STUDENT_NOT_VERIFIED'
  if (placements.some((placement) => LIVE_PLACEMENT_STATUSES.has(placement.status))) return 'STUDENT_NOT_AVAILABLE'
  if (candidacies.some((candidacy) => candidacy.opportunityId === opportunity.id)) return 'STUDENT_ALREADY_APPLIED'
  if (opportunity.mode !== 'PUBLIC' && opportunity.mode !== 'HYBRID') return 'OPPORTUNITY_NOT_PUBLIC'
  if (opportunity.applicationDeadline && isPastDeadline(opportunity.applicationDeadline, today)) {
    return 'OPPORTUNITY_DEADLINE_PASSED'
  }
  return null
}

/** `today.isAfter(deadline)` — the deadline day itself is still open, matching the backend. */
function isPastDeadline(deadline: string, today: Date): boolean {
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return todayIso > deadline
}

// ---------------------------------------------------------------- readiness checklist

export type ReadinessStepId = 'profile' | 'cv' | 'enrollment' | 'verification'

export interface ReadinessStep {
  id: ReadinessStepId
  done: boolean
  /** Where the student goes to finish it. */
  to: string
}

export interface ReadinessInput {
  profile: StudentProfileResponse | null
  hasCv: boolean
  enrollment: StudentEnrollmentResponse | null
}

/**
 * The concrete steps between a new account and being able to take part, each one a real backend
 * fact rather than a score: a saved profile, an uploaded CV, a claimed enrollment, and a university
 * that has verified it. Nothing here is weighted or invented — the percentage is simply how many of
 * these four are done.
 */
export function readinessSteps({ profile, hasCv, enrollment }: ReadinessInput): ReadinessStep[] {
  return [
    { id: 'profile', done: !!profile?.fullName, to: '/student/profile' },
    { id: 'cv', done: hasCv, to: '/student/profile' },
    { id: 'enrollment', done: !!enrollment, to: '/student/enrollment' },
    { id: 'verification', done: enrollment?.verificationStatus === 'VERIFIED', to: '/student/enrollment' },
  ]
}

export function readinessPercent(steps: ReadinessStep[]): number {
  if (steps.length === 0) return 0
  return Math.round((steps.filter((step) => step.done).length / steps.length) * 100)
}
