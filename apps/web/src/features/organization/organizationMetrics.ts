import type { OpportunityResponse, OpportunityStatus } from '../opportunities/types'
import type { PlacementResponse, PlacementStatus } from '../placements/types'
import type { CandidateRowResponse } from '../recruitment/types'

/**
 * Everything the organization dashboard shows, counted from the list endpoints the organization's
 * own pages already call.
 *
 * <p>FursadHub has no organization statistics endpoint, so nothing here is a server aggregate — and
 * nothing here is invented either. Each figure counts records the caller is already authorized to
 * read, which means every total is automatically scoped the way the API scoped the list.
 */

/** The opportunity states that can currently receive candidates. */
export const RECRUITING_OPPORTUNITY_STATUSES: OpportunityStatus[] = ['PUBLISHED', 'PAUSED']

/** The order statuses are shown in: the lifecycle's own order, not by size (CLAUDE.md section 33). */
export const OPPORTUNITY_STATUS_ORDER: OpportunityStatus[] = [
  'DRAFT',
  'PUBLISHED',
  'PAUSED',
  'CLOSED',
  'CANCELLED',
]

/** Placements that still occupy a student — the same set the rest of the product treats as live. */
export const LIVE_PLACEMENT_STATUSES: PlacementStatus[] = ['PLANNED', 'ACTIVE', 'COMPLETION_PENDING']

export function countByOpportunityStatus(opportunities: OpportunityResponse[]): Record<OpportunityStatus, number> {
  const counts = Object.fromEntries(OPPORTUNITY_STATUS_ORDER.map((status) => [status, 0])) as Record<
    OpportunityStatus,
    number
  >
  for (const opportunity of opportunities) {
    if (opportunity.status in counts) counts[opportunity.status] += 1
  }
  return counts
}

/**
 * "Active internships" on the approved dashboard.
 *
 * <p>PUBLISHED only. A PAUSED opportunity still exists and still holds its candidates, but it is
 * not live to applicants, and counting it as active would overstate what the organization currently
 * has in market.
 */
export function activeOpportunityCount(opportunities: OpportunityResponse[]): number {
  return opportunities.filter((opportunity) => opportunity.status === 'PUBLISHED').length
}

/** The opportunities a candidate pool can be read from at all — the fan-out set. */
export function recruitingOpportunities(opportunities: OpportunityResponse[]): OpportunityResponse[] {
  return opportunities.filter((opportunity) => RECRUITING_OPPORTUNITY_STATUSES.includes(opportunity.status))
}

export function livePlacementCount(placements: PlacementResponse[]): number {
  return placements.filter((placement) => LIVE_PLACEMENT_STATUSES.includes(placement.status)).length
}

/** Interns actually on site right now — narrower than "live", which includes PLANNED. */
export function currentInternCount(placements: PlacementResponse[]): number {
  return placements.filter(
    (placement) => placement.status === 'ACTIVE' || placement.status === 'COMPLETION_PENDING',
  ).length
}

/**
 * Placements still missing an organization supervisor — the one thing on this list that is
 * somebody's job today, and the reason the dashboard surfaces it.
 */
export function placementsMissingSupervisor(placements: PlacementResponse[]): PlacementResponse[] {
  return placements.filter(
    (placement) =>
      (placement.status === 'PLANNED' || placement.status === 'ACTIVE') && !placement.organizationSupervisor,
  )
}

export interface UniversityPartner {
  id: string
  name: string | null
  placementCount: number
  livePlacementCount: number
  /** Distinct students from this university the organization has hosted. */
  studentCount: number
}

/**
 * The universities this organization actually works with, derived from its own placement list.
 *
 * <p>FursadHub has no "partnership" record — a university becomes a partner by placing a student
 * with you, so that is exactly how this is counted rather than inventing a directory. It mirrors
 * `universityMetrics.partnerOrganizations`, which reads the same relationship from the other side.
 */
export function universityPartners(placements: PlacementResponse[]): UniversityPartner[] {
  const byId = new Map<string, UniversityPartner & { students: Set<string> }>()

  for (const placement of placements) {
    const isLive = LIVE_PLACEMENT_STATUSES.includes(placement.status)
    const existing = byId.get(placement.universityId)
    if (existing) {
      existing.placementCount += 1
      if (isLive) existing.livePlacementCount += 1
      existing.students.add(placement.studentUserId)
      continue
    }
    byId.set(placement.universityId, {
      id: placement.universityId,
      name: placement.universityName,
      placementCount: 1,
      livePlacementCount: isLive ? 1 : 0,
      studentCount: 0,
      students: new Set([placement.studentUserId]),
    })
  }

  return [...byId.values()]
    .map(({ students, ...partner }) => ({ ...partner, studentCount: students.size }))
    .sort((a, b) => b.livePlacementCount - a.livePlacementCount || b.placementCount - a.placementCount)
}

/** One opportunity paired with the candidate pool that was read for it. */
export interface OpportunityCandidates {
  opportunity: OpportunityResponse
  candidates: CandidateRowResponse[]
}

/** Every candidate across the opportunities that were scanned, flattened for board/summary counts. */
export function allCandidates(rows: OpportunityCandidates[]): CandidateRowResponse[] {
  return rows.flatMap((row) => row.candidates)
}

/** The most recently created candidacies across the scanned opportunities — the "Recent applications" panel. */
export function recentApplications(rows: OpportunityCandidates[], limit: number) {
  return rows
    .flatMap((row) => row.candidates.map((candidate) => ({ candidate, opportunity: row.opportunity })))
    .sort((a, b) => b.candidate.createdAt.localeCompare(a.candidate.createdAt))
    .slice(0, limit)
}
