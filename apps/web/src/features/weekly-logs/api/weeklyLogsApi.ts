import { apiFetch } from '../../../lib/api/client'
import type { WeeklyLogInput, WeeklyLogResponse } from '../types'

export function listWeeklyLogs(placementId: string) {
  return apiFetch<WeeklyLogResponse[]>(`/placements/${placementId}/weekly-logs`, { method: 'GET' })
}

/**
 * How many weeks this internship has, derived by the backend from the placement's own dates. The UI
 * offers only weeks that exist rather than inventing a range of its own.
 */
export function getExpectedWeekCount(placementId: string) {
  return apiFetch<{ expectedWeekCount: number }>(
    `/placements/${placementId}/weekly-logs/expected-weeks`,
    { method: 'GET' },
  )
}

export function createWeeklyLog(placementId: string, weekNumber: number, input: WeeklyLogInput) {
  return apiFetch<WeeklyLogResponse>(`/placements/${placementId}/weekly-logs`, {
    method: 'POST',
    body: { weekNumber, ...input },
  })
}

export function updateWeeklyLog(logId: string, input: WeeklyLogInput) {
  return apiFetch<WeeklyLogResponse>(`/weekly-logs/${logId}`, { method: 'PUT', body: input })
}

/**
 * Each transition is its own named command, matching the backend exactly (CLAUDE.md section 10).
 * There is deliberately no generic "set state" call.
 */
export function submitWeeklyLog(logId: string) {
  return apiFetch<WeeklyLogResponse>(`/weekly-logs/${logId}/submit`, { method: 'POST' })
}

export function reviewWeeklyLog(logId: string, comment?: string) {
  return apiFetch<WeeklyLogResponse>(`/weekly-logs/${logId}/review`, {
    method: 'POST',
    body: { comment: comment ?? null },
  })
}

export function returnWeeklyLog(logId: string, comment: string) {
  return apiFetch<WeeklyLogResponse>(`/weekly-logs/${logId}/return`, {
    method: 'POST',
    body: { comment },
  })
}
