import { apiFetch } from '../../../lib/api/client'
import type { AttendanceResponse, AttendanceValue } from '../types'

export function listAttendance(placementId: string) {
  return apiFetch<AttendanceResponse[]>(`/placements/${placementId}/attendance`, { method: 'GET' })
}

/**
 * Records one day. Note what is NOT sent: no coordinates, no device identifier, no biometric signal.
 * V1 attendance is a human record (CLAUDE.md section 43), and the backend accepts nothing else.
 */
export function recordAttendance(
  placementId: string,
  attendanceDate: string,
  attendanceValue: AttendanceValue,
  notes?: string,
) {
  return apiFetch<AttendanceResponse>(`/placements/${placementId}/attendance`, {
    method: 'POST',
    body: { attendanceDate, attendanceValue, notes: notes ?? null },
  })
}

export function confirmAttendance(recordId: string) {
  return apiFetch<AttendanceResponse>(`/attendance/${recordId}/confirm`, { method: 'POST' })
}

export function disputeAttendance(recordId: string, reason: string) {
  return apiFetch<AttendanceResponse>(`/attendance/${recordId}/dispute`, {
    method: 'POST',
    body: { reason },
  })
}

export function resolveAttendance(
  recordId: string,
  correctedValue: AttendanceValue | null,
  resolutionNote?: string,
) {
  return apiFetch<AttendanceResponse>(`/attendance/${recordId}/resolve`, {
    method: 'POST',
    body: { correctedValue, resolutionNote: resolutionNote ?? null },
  })
}
