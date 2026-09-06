import { useQueries } from '@tanstack/react-query'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import type { OpportunityResponse } from '../../opportunities/types'
import { recruitingOpportunities, type OpportunityCandidates } from '../organizationMetrics'

/**
 * How many opportunities one organization-wide candidate view will fan out over.
 *
 * <p>The candidate pool is addressed per opportunity — `GET /opportunities/{id}/candidacies` — and
 * there is no organization-wide candidacy endpoint to call instead. An org-wide pipeline therefore
 * has to ask once per recruiting opportunity, so it asks about a bounded number and says plainly
 * when it stopped, rather than firing an unbounded burst for an organization with a large
 * portfolio. Adding the missing endpoint is a backend change and is out of scope for this phase.
 */
export const CANDIDATE_FANOUT_LIMIT = 25

export interface OrganizationCandidates {
  rows: OpportunityCandidates[]
  isLoading: boolean
  /** True when at least one opportunity's pool could not be read; the rest still render. */
  hasErrors: boolean
  /** Recruiting opportunities past {@link CANDIDATE_FANOUT_LIMIT} that were deliberately not queried. */
  notScanned: number
  /** Recruiting opportunities in scope, before the cap. */
  totalInScope: number
}

/**
 * Reads the candidate pool across the opportunities this organization is currently recruiting for.
 *
 * <p>`opportunities` must be the list the API returned for the caller's own organization
 * ({@code OpportunityQueryService.listForOrganization} re-checks membership), so this can never
 * reach another organization's pipeline: it only ever asks about ids that list already contained,
 * and {@code CandidacyAuthorization} re-authorizes each request regardless.
 *
 * <p>Only PUBLISHED/PAUSED opportunities are scanned. A DRAFT has never been open to applicants and
 * a CLOSED/CANCELLED one is finished, so querying either can only come back empty.
 *
 * <p>An opportunity whose pool comes back 403 is reported as an error rather than dropping the
 * whole view — the honest thing to show is that one pool could not be read, not a smaller total
 * presented as fact.
 */
export function useOrganizationCandidates(
  opportunities: OpportunityResponse[],
  enabled = true,
): OrganizationCandidates {
  const inScope = recruitingOpportunities(opportunities)
  const scanned = inScope.slice(0, CANDIDATE_FANOUT_LIMIT)

  const results = useQueries({
    queries: scanned.map((opportunity) => ({
      queryKey: ['recruitment', 'candidates', opportunity.id, 'ALL'],
      queryFn: () => recruitmentApi.listCandidates(opportunity.id),
      enabled,
      retry: false,
    })),
  })

  return {
    rows: scanned.map((opportunity, index) => ({
      opportunity,
      candidates: results[index]?.data ?? [],
    })),
    isLoading: enabled && results.some((result) => result.isLoading),
    hasErrors: results.some((result) => result.isError),
    notScanned: Math.max(inScope.length - scanned.length, 0),
    totalInScope: inScope.length,
  }
}
