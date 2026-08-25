import { apiFetch } from '../../../lib/api/client'
import type {
  EligibleSupervisorResponse,
  PlacementResponse,
  SupervisorAssignmentResponse,
} from '../types'

// ---------------------------------------------------------------- student

/**
 * The student's own placements. There is no student id in the path — the backend resolves the
 * student from the authenticated session (CLAUDE.md section 12), and the UI must never supply one.
 */
export function listMyPlacements() {
  return apiFetch<PlacementResponse[]>('/students/me/placements', { method: 'GET' })
}

export function getMyPlacement(placementId: string) {
  return apiFetch<PlacementResponse>(`/students/me/placements/${placementId}`, { method: 'GET' })
}

// ---------------------------------------------------------------- scoped listings

/** Narrowed by the caller's real role on the backend — an admin, coordinator and supervisor differ. */
export function listUniversityPlacements(universityId: string) {
  return apiFetch<PlacementResponse[]>(`/universities/${universityId}/placements`, { method: 'GET' })
}

export function listOrganizationPlacements(organizationId: string) {
  return apiFetch<PlacementResponse[]>(`/organizations/${organizationId}/placements`, { method: 'GET' })
}

// ---------------------------------------------------------------- detail

export function getPlacement(placementId: string) {
  return apiFetch<PlacementResponse>(`/placements/${placementId}`, { method: 'GET' })
}

/** Every assignment period, oldest first — closed ones included. */
export function listSupervisorHistory(placementId: string) {
  return apiFetch<SupervisorAssignmentResponse[]>(`/placements/${placementId}/supervisors`, {
    method: 'GET',
  })
}

// ---------------------------------------------------------------- lifecycle commands

/**
 * Each transition is its own named command, matching the backend exactly (CLAUDE.md section 10/33).
 * There is deliberately no generic "set status" call, and no `complete` — completion is gated on the
 * Phase 6 requirement checks and has no endpoint yet.
 */
export function startPlacement(placementId: string) {
  return apiFetch<PlacementResponse>(`/placements/${placementId}/start`, { method: 'POST' })
}

export function cancelPlacement(placementId: string, reason?: string) {
  return apiFetch<PlacementResponse>(`/placements/${placementId}/cancel`, {
    method: 'POST',
    body: { reason: reason ?? null },
  })
}

export function terminatePlacement(placementId: string, reason?: string) {
  return apiFetch<PlacementResponse>(`/placements/${placementId}/terminate`, {
    method: 'POST',
    body: { reason: reason ?? null },
  })
}

export function requestPlacementCompletion(placementId: string) {
  return apiFetch<PlacementResponse>(`/placements/${placementId}/request-completion`, { method: 'POST' })
}

// ---------------------------------------------------------------- supervisors

export function assignUniversitySupervisor(placementId: string, supervisorUserId: string) {
  return apiFetch<PlacementResponse>(`/placements/${placementId}/university-supervisor`, {
    method: 'POST',
    body: { supervisorUserId },
  })
}

export function assignOrganizationSupervisor(placementId: string, supervisorUserId: string) {
  return apiFetch<PlacementResponse>(`/placements/${placementId}/organization-supervisor`, {
    method: 'POST',
    body: { supervisorUserId },
  })
}

export function listEligibleUniversitySupervisors(placementId: string) {
  return apiFetch<EligibleSupervisorResponse[]>(
    `/placements/${placementId}/eligible-university-supervisors`,
    { method: 'GET' },
  )
}

export function listEligibleOrganizationSupervisors(placementId: string) {
  return apiFetch<EligibleSupervisorResponse[]>(
    `/placements/${placementId}/eligible-organization-supervisors`,
    { method: 'GET' },
  )
}
