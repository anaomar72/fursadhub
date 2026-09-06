import type { CandidacyStatus, CandidateRowResponse } from '../recruitment/types'
import type { OpportunityCandidates } from './organizationMetrics'

/**
 * The queues a recruiter actually works from, counted over the candidate pools the API returned.
 *
 * <p>Every state named here is a real {@code CandidacyStatus} (CLAUDE.md section 37) — none of the
 * prototype's invented stage names appear, and none of these buckets is a status of its own. They
 * are groupings OF real statuses, chosen because they answer "what needs me today?".
 */

/** Nobody has looked at these yet. The recruiter's inbox. */
export const NEW_STATUSES: CandidacyStatus[] = ['SUBMITTED']

/**
 * Waiting on the ORGANIZATION to act. A candidate sitting in UNDER_REVIEW or INTERVIEW is
 * mid-assessment; one still SUBMITTED has not been picked up. All three are the recruiter's move.
 */
export const AWAITING_ORGANIZATION_STATUSES: CandidacyStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'INTERVIEW']

/**
 * Waiting on the STUDENT. An offer is out and the recruiter can do nothing but wait — which is
 * exactly why it is worth surfacing separately rather than folding into "in progress".
 */
export const AWAITING_CANDIDATE_STATUSES: CandidacyStatus[] = ['OFFERED']

export interface RecruiterQueues {
  /** Every candidate across the scanned internships, flattened. */
  all: CandidateRowResponse[]
  newApplications: CandidateRowResponse[]
  awaitingReview: CandidateRowResponse[]
  shortlisted: CandidateRowResponse[]
  awaitingCandidate: CandidateRowResponse[]
  /** Reached a decision that closes the candidacy: hired, rejected, withdrawn, offer not taken up. */
  accepted: CandidateRowResponse[]
}

/** One candidate paired with the internship whose pool it came from. */
export interface CandidateWithOpportunity {
  candidate: CandidateRowResponse
  opportunityId: string
  opportunityTitle: string
}

export function withOpportunity(rows: OpportunityCandidates[]): CandidateWithOpportunity[] {
  return rows.flatMap((row) =>
    row.candidates.map((candidate) => ({
      candidate,
      opportunityId: row.opportunity.id,
      opportunityTitle: row.opportunity.title,
    })),
  )
}

export function recruiterQueues(rows: OpportunityCandidates[]): RecruiterQueues {
  const all = rows.flatMap((row) => row.candidates)
  const inStatus = (statuses: CandidacyStatus[]) => all.filter((candidate) => statuses.includes(candidate.status))

  return {
    all,
    newApplications: inStatus(NEW_STATUSES),
    awaitingReview: inStatus(AWAITING_ORGANIZATION_STATUSES),
    shortlisted: inStatus(['SHORTLISTED']),
    awaitingCandidate: inStatus(AWAITING_CANDIDATE_STATUSES),
    accepted: inStatus(['ACCEPTED']),
  }
}

/**
 * The candidates a recruiter should look at first: the ones nobody has picked up, oldest first.
 *
 * <p>Oldest first rather than newest, deliberately — an application that has been waiting a week is
 * more urgent than one that arrived this morning, and a "recent applications" ordering would bury
 * exactly the people who have been waiting longest.
 */
export function needsAttention(rows: OpportunityCandidates[], limit: number): CandidateWithOpportunity[] {
  return withOpportunity(rows)
    .filter((row) => AWAITING_ORGANIZATION_STATUSES.includes(row.candidate.status))
    .sort((a, b) => a.candidate.createdAt.localeCompare(b.candidate.createdAt))
    .slice(0, limit)
}

/**
 * Live offers, soonest deadline first — the other half of a recruiter's day, where the work is
 * chasing rather than reviewing.
 */
export function liveOffers(rows: OpportunityCandidates[], limit: number): CandidateWithOpportunity[] {
  return withOpportunity(rows)
    .filter((row) => row.candidate.status === 'OFFERED' && row.candidate.liveOffer !== null)
    .sort((a, b) =>
      (a.candidate.liveOffer?.responseDeadline ?? '').localeCompare(b.candidate.liveOffer?.responseDeadline ?? ''),
    )
    .slice(0, limit)
}

/** Per-internship totals for the recruiter's internship panel. */
export interface OpportunityLoad {
  opportunityId: string
  title: string
  total: number
  awaitingReview: number
}

export function opportunityLoad(rows: OpportunityCandidates[]): OpportunityLoad[] {
  return rows
    .map((row) => ({
      opportunityId: row.opportunity.id,
      title: row.opportunity.title,
      total: row.candidates.length,
      awaitingReview: row.candidates.filter((candidate) =>
        AWAITING_ORGANIZATION_STATUSES.includes(candidate.status),
      ).length,
    }))
    .sort((a, b) => b.awaitingReview - a.awaitingReview || b.total - a.total)
}
