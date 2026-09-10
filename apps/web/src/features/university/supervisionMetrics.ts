import type { AttendanceResponse } from '../attendance/types'
import type { FinalReportResponse } from '../final-reports/types'
import type { PlacementResponse, PlacementStatus } from '../placements/types'
import type { WeeklyLogResponse } from '../weekly-logs/types'

/**
 * The counts a university supervisor's portal is built from.
 *
 * <p>FursadHub has no cross-placement supervision endpoint and no statistics endpoint, so nothing
 * here is a server aggregate. Each figure is counted over records the caller has already been
 * authorized to read, one placement at a time, which means every total is automatically scoped the
 * way the API scoped the underlying list: a supervisor's placements are their own assignments, a
 * coordinator's are their departments. Nothing is fabricated and nothing is derived from a wider
 * set than the caller was given.
 */

/** Placements that can still accumulate internship records — the backend's own RECORDABLE set. */
export const RECORDABLE_PLACEMENT_STATUSES: PlacementStatus[] = ['ACTIVE', 'COMPLETION_PENDING']

export function isRecordable(placement: PlacementResponse): boolean {
  return RECORDABLE_PLACEMENT_STATUSES.includes(placement.status)
}

/**
 * The placements a supervision view fans out over.
 *
 * <p>Only running placements: a PLANNED internship has no records yet and a CLOSED one has nothing
 * left to review, so querying either would be a request that can only come back empty.
 */
export function supervisablePlacements(placements: PlacementResponse[]): PlacementResponse[] {
  return placements.filter(isRecordable)
}

/** Logs the student has handed in and nobody has reviewed — the supervisor's actual inbox. */
export function logsAwaitingReview(logs: WeeklyLogResponse[]): WeeklyLogResponse[] {
  return logs.filter((log) => log.state === 'SUBMITTED')
}

/** A report is the supervisor's to act on only once the student has submitted it. */
export function reportAwaitingReview(report: FinalReportResponse | null): boolean {
  return report?.state === 'SUBMITTED'
}

/**
 * Attendance that is not settled yet.
 *
 * <p>DISPUTED only — RECORDED is simply waiting on the student, and CONFIRMED/RESOLVED are done. A
 * dispute is what blocks completion and what university staff need to know about, even though the
 * settling itself belongs to the assigned organization supervisor
 * ({@code AttendanceService.resolve}), so this is a read-only signal here.
 */
export function disputedAttendance(records: AttendanceResponse[]): AttendanceResponse[] {
  return records.filter((record) => record.confirmationStatus === 'DISPUTED')
}

/** One student as their supervising staff member sees them: through the placements in scope. */
export interface SupervisedStudent {
  studentUserId: string
  fullName: string | null
  email: string | null
  departmentId: string
  departmentName: string | null
  /** Newest first. A student may hold more than one placement over time (CLAUDE.md section 39). */
  placements: PlacementResponse[]
  /** The running placement, if any — the one a supervisor is actually working on right now. */
  currentPlacement: PlacementResponse | null
}

/**
 * The distinct students behind a scoped placement list.
 *
 * <p>This is how a {@code UNIVERSITY_SUPERVISOR} gets a student list at all:
 * {@code GET /universities/{id}/students} is {@code UNIVERSITY_ADMIN}/{@code DEPARTMENT_COORDINATOR}
 * only ({@code VerificationQueryService.scopedEnrollments}), so a supervisor's roster is exactly the
 * set of students on the placements they are actively assigned to — no wider, and no extra request.
 */
export function supervisedStudents(placements: PlacementResponse[]): SupervisedStudent[] {
  const byStudent = new Map<string, SupervisedStudent>()

  for (const placement of placements) {
    const existing = byStudent.get(placement.studentUserId)
    if (existing) {
      existing.placements.push(placement)
      continue
    }
    byStudent.set(placement.studentUserId, {
      studentUserId: placement.studentUserId,
      fullName: placement.studentFullName,
      email: placement.studentEmail,
      departmentId: placement.departmentId,
      departmentName: placement.departmentName,
      placements: [placement],
      currentPlacement: null,
    })
  }

  return [...byStudent.values()]
    .map((student) => {
      student.placements.sort((a, b) => b.startDate.localeCompare(a.startDate))
      return { ...student, currentPlacement: student.placements.find(isRecordable) ?? null }
    })
    .sort((a, b) => (a.fullName ?? a.email ?? '').localeCompare(b.fullName ?? b.email ?? ''))
}
