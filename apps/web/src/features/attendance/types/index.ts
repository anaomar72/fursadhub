/** Phase 6 attendance contracts (CLAUDE.md section 43). */

export type AttendanceValue = 'PRESENT' | 'ABSENT' | 'EXCUSED'

/**
 * RECORDED and DISPUTED are UNSETTLED — someone still has to act on them, and they are what block
 * completion. CONFIRMED and RESOLVED are settled.
 */
export type AttendanceConfirmationStatus = 'RECORDED' | 'CONFIRMED' | 'DISPUTED' | 'RESOLVED'

export interface AttendanceResponse {
  id: string
  placementId: string
  attendanceDate: string
  attendanceValue: AttendanceValue
  confirmationStatus: AttendanceConfirmationStatus
  notes: string | null
  /** The student's own words. A resolution never rewrites it. */
  disputeReason: string | null
  resolutionNote: string | null
  confirmedAt: string | null
  disputedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}
