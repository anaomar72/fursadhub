import { useQueries } from '@tanstack/react-query'
import * as attendanceApi from '../../attendance/api/attendanceApi'
import * as evaluationsApi from '../../evaluations/api/evaluationsApi'
import * as finalReportsApi from '../../final-reports/api/finalReportsApi'
import * as weeklyLogsApi from '../../weekly-logs/api/weeklyLogsApi'
import type { AttendanceResponse } from '../../attendance/types'
import type { EvaluationResponse } from '../../evaluations/types'
import type { FinalReportResponse } from '../../final-reports/types'
import type { WeeklyLogResponse } from '../../weekly-logs/types'
import type { PlacementResponse, PlacementStatus } from '../types'

/**
 * How many placements one cross-placement view will fan out over.
 *
 * <p>The internship-management API is addressed per placement — `GET /placements/{id}/weekly-logs`,
 * `/final-report`, `/attendance`, `/evaluation` — and there is no cross-placement endpoint to call
 * instead. Any "everything waiting on me" view therefore has to ask once per placement, so it asks
 * about a bounded number and says plainly when it stopped, rather than firing an unbounded burst.
 * Adding the missing endpoints is a backend change and is out of scope.
 */
export const PLACEMENT_RECORD_FANOUT_LIMIT = 40

/**
 * The placement states that can actually hold internship records — the backend's own RECORDABLE
 * set. A PLANNED placement has no records yet and a closed one has nothing left to act on, so
 * querying either can only come back empty.
 */
export const RECORDABLE_PLACEMENT_STATUSES: PlacementStatus[] = ['ACTIVE', 'COMPLETION_PENDING']

export function isRecordable(placement: PlacementResponse): boolean {
  return RECORDABLE_PLACEMENT_STATUSES.includes(placement.status)
}

export function recordablePlacements(placements: PlacementResponse[]): PlacementResponse[] {
  return placements.filter(isRecordable)
}

/**
 * The internship-management sections a cross-placement view can read.
 *
 * <p>Which of these a given caller may actually read is the BACKEND's decision, not this hook's:
 * `weekly-logs` and `final-report` go through {@code requireAcademicReadAccess}, which admits the
 * owning student and university staff in scope ONLY — organization staff, supervisors included, are
 * excluded by design. `attendance` and `evaluation` go through {@code requireWorkplaceReadAccess},
 * which admits all three parties. Callers must only ask for sections their role is entitled to.
 */
export type PlacementRecordSection = 'weekly-logs' | 'final-report' | 'attendance' | 'evaluation'

type SectionData = {
  'weekly-logs': WeeklyLogResponse[]
  'final-report': FinalReportResponse | null
  attendance: AttendanceResponse[]
  evaluation: EvaluationResponse | null
}

/** One placement paired with whatever that section returned for it. */
export interface PlacementRecordRow<S extends PlacementRecordSection> {
  placement: PlacementResponse
  data: SectionData[S] | undefined
  isError: boolean
}

export interface PlacementRecords<S extends PlacementRecordSection> {
  rows: PlacementRecordRow<S>[]
  isLoading: boolean
  /** True when at least one placement's records could not be read; the rest still render. */
  hasErrors: boolean
  /** Placements past {@link PLACEMENT_RECORD_FANOUT_LIMIT} that this view deliberately did not query. */
  notScanned: number
  /** Running placements in scope, before the cap — what the "scanned N of M" line reports against. */
  totalInScope: number
}

function fetcher(section: PlacementRecordSection, placementId: string) {
  switch (section) {
    case 'weekly-logs':
      return weeklyLogsApi.listWeeklyLogs(placementId)
    case 'final-report':
      return finalReportsApi.getFinalReport(placementId)
    case 'attendance':
      return attendanceApi.listAttendance(placementId)
    case 'evaluation':
      return evaluationsApi.getEvaluation(placementId)
  }
}

/**
 * Reads one internship-management section across the placements the caller is already scoped to.
 *
 * <p>`placements` must be the list the API returned. The backend has already narrowed it to the
 * caller's real scope — {@code PlacementQueryService} gives a university admin their whole
 * university, a coordinator their departments, and either kind of supervisor only the placements
 * they are ACTIVELY ASSIGNED to. This hook never widens that set and never accepts an id from the
 * caller, so a supervisor cannot reach an unrelated intern's records by driving the UI, and every
 * per-placement request is re-authorized by the API regardless (CLAUDE.md section 24).
 *
 * <p>A placement whose records come back 403/404 is reported as an error row rather than dropping
 * the whole view: the honest thing to show is that one row could not be read, not a smaller total
 * presented as fact.
 */
export function usePlacementRecords<S extends PlacementRecordSection>(
  placements: PlacementResponse[],
  section: S,
  enabled = true,
): PlacementRecords<S> {
  const inScope = recordablePlacements(placements)
  const scanned = inScope.slice(0, PLACEMENT_RECORD_FANOUT_LIMIT)

  const results = useQueries({
    queries: scanned.map((placement) => ({
      queryKey: [section, placement.id],
      queryFn: () => fetcher(section, placement.id),
      enabled,
      retry: false,
    })),
  })

  return {
    rows: scanned.map((placement, index) => ({
      placement,
      data: results[index]?.data as SectionData[S] | undefined,
      isError: results[index]?.isError ?? false,
    })),
    isLoading: enabled && results.some((result) => result.isLoading),
    hasErrors: results.some((result) => result.isError),
    notScanned: Math.max(inScope.length - scanned.length, 0),
    totalInScope: inScope.length,
  }
}
