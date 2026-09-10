import type { AttendanceResponse } from '../attendance/types'
import type { EvaluationResponse } from '../evaluations/types'
import type { PlacementResponse } from '../placements/types'
import { isRecordable } from '../placements/hooks/usePlacementRecords'

/**
 * The counts an organization supervisor's portal is built from.
 *
 * <p>Every figure is counted over records the caller has already been authorized to read, one
 * placement at a time. There is no cross-placement endpoint and no statistics endpoint, so nothing
 * here is a server aggregate — but every total is automatically scoped the way the API scoped the
 * placement list, which for this role is their ACTIVE supervisor assignments and nothing else
 * ({@code PlacementQueryService.listForOrganization}).
 */

/**
 * Attendance that still needs somebody.
 *
 * <p>Both states are the supervisor's own move, which is why they are grouped: RECORDED is waiting
 * for them to confirm it, DISPUTED is waiting for them to resolve it. CONFIRMED and RESOLVED are
 * settled. Unsettled attendance is also what blocks placement completion, so this is the number
 * that actually matters.
 */
export function unsettledAttendance(records: AttendanceResponse[]): AttendanceResponse[] {
  return records.filter(
    (record) => record.confirmationStatus === 'RECORDED' || record.confirmationStatus === 'DISPUTED',
  )
}

/** Disputes specifically — the subset a student has actively pushed back on. */
export function disputedAttendance(records: AttendanceResponse[]): AttendanceResponse[] {
  return records.filter((record) => record.confirmationStatus === 'DISPUTED')
}

/**
 * Whether the evaluation is still the supervisor's to finish.
 *
 * <p>Absent counts as outstanding: no evaluation row yet means nobody has started writing it. FINAL
 * is done and can never be reopened ({@code PlacementEvaluationService.finalizeEvaluation} is
 * terminal), so only DRAFT, SUBMITTED and "not started" are work.
 */
export function evaluationOutstanding(evaluation: EvaluationResponse | null | undefined): boolean {
  return !evaluation || evaluation.state !== 'FINAL'
}

/** How far through the six fixed ratings a draft is — the only progress figure the schema supports. */
export function evaluationRatingsComplete(evaluation: EvaluationResponse | null | undefined): number {
  if (!evaluation) return 0
  return [
    evaluation.professionalismRating,
    evaluation.reliabilityRating,
    evaluation.communicationRating,
    evaluation.workPerformanceRating,
    evaluation.teamworkRating,
    evaluation.overallRating,
  ].filter((rating) => rating !== null).length
}

/** One intern as their organization supervisor sees them: through the placement they are assigned. */
export interface SupervisedIntern {
  placement: PlacementResponse
  studentUserId: string
  fullName: string | null
  email: string | null
  universityName: string | null
  departmentName: string | null
  /** True while the placement can still accumulate records — the ones the supervisor works on. */
  running: boolean
}

/**
 * The interns behind an assigned placement list.
 *
 * <p>An organization supervisor has no student directory: there is no organization-side student
 * endpoint at all, and {@code CandidacyAuthorization} excludes the role from the candidate pool. So
 * "my interns" IS the assigned placement list, presented per person — every field comes from the
 * placement record the API already returned, and no additional endpoint is called.
 *
 * <p>Unlike the university side, one row per PLACEMENT rather than per student: an organization
 * supervisor is assigned to placements individually, so two placements for the same person are two
 * separate supervision responsibilities.
 */
export function supervisedInterns(placements: PlacementResponse[]): SupervisedIntern[] {
  return placements
    .map((placement) => ({
      placement,
      studentUserId: placement.studentUserId,
      fullName: placement.studentFullName,
      email: placement.studentEmail,
      universityName: placement.universityName,
      departmentName: placement.departmentName,
      running: isRecordable(placement),
    }))
    .sort((a, b) => {
      // Running placements first — those are the ones with work attached.
      if (a.running !== b.running) return a.running ? -1 : 1
      return (a.fullName ?? a.email ?? '').localeCompare(b.fullName ?? b.email ?? '')
    })
}
