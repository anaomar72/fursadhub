import type { CandidateRowResponse } from '../recruitment/types'
import type { OpportunityResponse } from '../opportunities/types'
import type { PlacementResponse } from '../placements/types'
import type { AttendanceResponse } from '../attendance/types'
import type { EvaluationResponse } from '../evaluations/types'
import { placementsMissingSupervisor } from './organizationMetrics'
import { disputedAttendance, evaluationOutstanding } from './supervisorMetrics'

/**
 * What needs an organization member's attention, by role — for DISPLAY ONLY, read from records the
 * caller was already authorized to load. Every item is a count of a real backend state with a real
 * destination; nothing is a score and nothing is invented urgency. Each role gets only the work it
 * is allowed to do (organizationCapabilities): recruiting items for recruiting roles, supervision
 * items for supervisors, organization upkeep for the admin.
 */
export type OrganizationAttention =
  | { kind: 'newApplications'; count: number }
  | { kind: 'awaitingReview'; count: number }
  | { kind: 'interviews'; count: number }
  | { kind: 'offersAwaitingCandidate'; count: number }
  | { kind: 'placementsWithoutSupervisor'; count: number }
  | { kind: 'draftsToPublish'; count: number }
  | { kind: 'attendanceToConfirm'; count: number }
  | { kind: 'attendanceDisputed'; count: number }
  | { kind: 'evaluationsDue'; count: number }

const count = (candidates: CandidateRowResponse[], status: CandidateRowResponse['status']) =>
  candidates.filter((candidate) => candidate.status === status).length

/** Recruiting roles (ORGANIZATION_ADMIN, RECRUITER): the candidate pipeline's waiting work. */
export function recruitingAttention(candidates: CandidateRowResponse[]): OrganizationAttention[] {
  const items: OrganizationAttention[] = [
    { kind: 'newApplications', count: count(candidates, 'SUBMITTED') },
    { kind: 'awaitingReview', count: count(candidates, 'UNDER_REVIEW') },
    { kind: 'interviews', count: count(candidates, 'INTERVIEW') },
    // Waiting on the CANDIDATE, not on the organization — shown as information, so the team knows
    // which offers are open, without pretending it is theirs to act on.
    { kind: 'offersAwaitingCandidate', count: count(candidates, 'OFFERED') },
  ]
  return items.filter((item) => item.count > 0)
}

/** The admin: recruiting work, plus the organization upkeep only an admin can do. */
export function adminAttention({
  candidates,
  placements,
  opportunities,
  verified,
}: {
  candidates: CandidateRowResponse[]
  placements: PlacementResponse[]
  opportunities: OpportunityResponse[]
  /** Drafts can only be published once the organization is verified (OrganizationVerificationGuard). */
  verified: boolean
}): OrganizationAttention[] {
  const items = recruitingAttention(candidates)
  const unsupervised = placementsMissingSupervisor(placements).length
  if (unsupervised > 0) items.push({ kind: 'placementsWithoutSupervisor', count: unsupervised })
  const drafts = opportunities.filter((opportunity) => opportunity.status === 'DRAFT').length
  if (verified && drafts > 0) items.push({ kind: 'draftsToPublish', count: drafts })
  return items
}

/**
 * The organization supervisor: the two workplace records the backend lets them act on.
 * RECORDED attendance waits for their confirmation and DISPUTED for their resolution
 * (AttendanceService.confirm/resolve); the evaluation is theirs until FINAL.
 */
export function supervisorAttention({
  attendance,
  evaluations,
}: {
  attendance: (AttendanceResponse[] | undefined)[]
  evaluations: { loaded: boolean; data: EvaluationResponse | null | undefined }[]
}): OrganizationAttention[] {
  const records = attendance.flatMap((rows) => rows ?? [])
  const toConfirm = records.filter((record) => record.confirmationStatus === 'RECORDED').length
  const disputed = disputedAttendance(records).length
  // Only evaluations whose read actually completed are counted — a failed read is not "due".
  const due = evaluations.filter((row) => row.loaded && evaluationOutstanding(row.data)).length

  const items: OrganizationAttention[] = []
  if (disputed > 0) items.push({ kind: 'attendanceDisputed', count: disputed })
  if (toConfirm > 0) items.push({ kind: 'attendanceToConfirm', count: toConfirm })
  if (due > 0) items.push({ kind: 'evaluationsDue', count: due })
  return items
}

/** Where each item's work is done. Stage filters are real URL state on the candidates page. */
export const ATTENTION_DESTINATION: Record<OrganizationAttention['kind'], string> = {
  newApplications: '/organization/candidates?stage=SUBMITTED',
  awaitingReview: '/organization/candidates?stage=UNDER_REVIEW',
  interviews: '/organization/candidates?stage=INTERVIEW',
  offersAwaitingCandidate: '/organization/candidates?stage=OFFERED',
  placementsWithoutSupervisor: '/organization/placements',
  draftsToPublish: '/organization/opportunities',
  attendanceToConfirm: '/organization/supervision',
  attendanceDisputed: '/organization/supervision',
  evaluationsDue: '/organization/supervision?section=evaluation',
}

/** Items that are information (someone else's move), not the reader's action. */
export const INFORMATIONAL: ReadonlySet<OrganizationAttention['kind']> = new Set(['offersAwaitingCandidate', 'draftsToPublish'])
