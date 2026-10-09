import type { NominationResponse, TargetRequestResponse } from '../recruitment/types'
import type { PlacementResponse } from '../placements/types'
import type { FinalReportResponse } from '../final-reports/types'
import type { WeeklyLogResponse } from '../weekly-logs/types'
import type { VerificationCaseResponse } from './types'
import { LIVE_PLACEMENT_STATUSES } from './universityMetrics'
import { logsAwaitingReview, reportAwaitingReview } from './supervisionMetrics'

/**
 * What needs a university staff member's attention (Phase 7), derived only from lists the caller is
 * already authorized to read — never a server aggregate, never invented urgency.
 *
 * <p>Each item names a real state in a real state machine, with the backend rule that makes it
 * somebody's job cited beside it. Items with nothing in them are left out, so an empty list is the
 * honest "caught up" state rather than a column of zeros.
 */
export type UniversityAttentionKind =
  | 'casesToReview'
  | 'requestsOpen'
  | 'nominationsAwaitingStudent'
  | 'placementsAwaitingCompletion'
  | 'placementsWithoutSupervisor'
  | 'logsToReview'
  | 'reportsToReview'

export interface UniversityAttention {
  kind: UniversityAttentionKind
  count: number
}

/** Cases a reviewer can act on: {@code VerificationReviewService.requireReviewable}. */
export const REVIEWABLE_CASE_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW'])

/**
 * Target states in which the university is still expected to put names forward. COMPLETED,
 * DECLINED and EXPIRED are closed; the backend lists only PUBLISHED opportunities anyway
 * ({@code NominationQueryService.listTargetRequests}).
 */
export const OPEN_TARGET_STATUSES = new Set(['REQUESTED', 'ACKNOWLEDGED', 'NOMINATING'])

/** Today as the backend compares nomination deadlines: a calendar date, inclusive. */
export function todayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** {@code NominationService}: nominating fails once today is AFTER the target's deadline. */
export function nominationDeadlinePassed(request: Pick<TargetRequestResponse, 'nominationDeadline'>, today = todayIso()): boolean {
  return today > request.nominationDeadline
}

/**
 * A request still asking for nominees: open target state, deadline not passed, and fewer live
 * nominations than the organization requested. Requests already filled are not "work".
 */
export function requestNeedsNominees(request: TargetRequestResponse, today = todayIso()): boolean {
  return (
    OPEN_TARGET_STATUSES.has(request.targetStatus) &&
    !nominationDeadlinePassed(request, today) &&
    request.liveNominationCount < request.requestedNominees
  )
}

const live = (placement: PlacementResponse) => LIVE_PLACEMENT_STATUSES.includes(placement.status)

/** Running or upcoming internships with no academic supervisor assigned — the university's post to fill. */
export function placementsWithoutUniversitySupervisor(placements: PlacementResponse[]): PlacementResponse[] {
  return placements.filter((placement) => live(placement) && !placement.universitySupervisor)
}

/**
 * The work of a member with department scope — an admin over the whole university, a coordinator
 * over their departments. Inputs left `undefined` (not loaded, or failed) contribute nothing, so a
 * failed list never shows up as "nothing to do" for its own category's sake: callers render that
 * failure separately.
 */
export function coordinationAttention({
  cases,
  requests,
  nominations,
  placements,
  today = todayIso(),
}: {
  cases?: VerificationCaseResponse[]
  requests?: TargetRequestResponse[]
  nominations?: NominationResponse[]
  placements?: PlacementResponse[]
  today?: string
}): UniversityAttention[] {
  const items: UniversityAttention[] = [
    { kind: 'casesToReview', count: (cases ?? []).filter((item) => REVIEWABLE_CASE_STATUSES.has(item.status)).length },
    { kind: 'requestsOpen', count: (requests ?? []).filter((request) => requestNeedsNominees(request, today)).length },
    // Completion is the university's decision (requireUniversityCompletionAuthority: admin, or a
    // coordinator over that department), and COMPLETION_PENDING is the organization handing it over.
    { kind: 'placementsAwaitingCompletion', count: (placements ?? []).filter((p) => p.status === 'COMPLETION_PENDING').length },
    { kind: 'placementsWithoutSupervisor', count: placementsWithoutUniversitySupervisor(placements ?? []).length },
    // Information: the next step is the student's consent, not the university's.
    { kind: 'nominationsAwaitingStudent', count: (nominations ?? []).filter((n) => n.status === 'PENDING_STUDENT_CONSENT').length },
  ]
  return items.filter((item) => item.count > 0)
}

/**
 * An academic supervisor's work: logs handed in and not yet reviewed, and final reports submitted
 * for approval — both theirs to act on through {@code requireUniversityAcademicAccess}. A record
 * that could not be read contributes nothing rather than a guess.
 */
export function supervisionAttention({
  logs,
  reports,
}: {
  logs: (WeeklyLogResponse[] | undefined)[]
  reports: (FinalReportResponse | null | undefined)[]
}): UniversityAttention[] {
  const items: UniversityAttention[] = [
    { kind: 'logsToReview', count: logs.reduce((sum, list) => sum + logsAwaitingReview(list ?? []).length, 0) },
    { kind: 'reportsToReview', count: reports.filter((report) => reportAwaitingReview(report ?? null)).length },
  ]
  return items.filter((item) => item.count > 0)
}

/** Where each item is worked on. The list pages read these filters from the URL. */
export const UNIVERSITY_ATTENTION_DESTINATION: Record<UniversityAttentionKind, string> = {
  casesToReview: '/university/verification-cases?status=OPEN',
  requestsOpen: '/university/opportunity-requests',
  nominationsAwaitingStudent: '/university/nominations?status=PENDING_STUDENT_CONSENT',
  placementsAwaitingCompletion: '/university/placements?status=COMPLETION_PENDING',
  placementsWithoutSupervisor: '/university/placements?supervisor=unassigned',
  logsToReview: '/university/supervision',
  reportsToReview: '/university/supervision?section=final-report',
}

/** Items that are information about someone else's next step, not the reader's own command. */
export const UNIVERSITY_INFORMATIONAL = new Set<UniversityAttentionKind>(['nominationsAwaitingStudent'])
