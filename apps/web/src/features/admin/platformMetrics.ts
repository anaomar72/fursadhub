import type { StatusTone } from '../../components/ui'
import type { StatisticMachine } from './statusTone'
import type { PlatformStatistics } from './types'

/**
 * The dashboard's figures, derived from {@code GET /admin/statistics} and nothing else.
 *
 * <p>Every number on the Super Admin overview comes through here, which is what keeps the page
 * honest: there is no second source, no client-side estimate and no placeholder. If a figure the
 * prototype asked for cannot be computed from {@link PlatformStatistics}, it is not on the page —
 * see {@link headlineCounts} for the two the prototype wanted and the backend does not have.
 */

/** Sum of a `GROUP BY` map. The backend returns one key per enum value actually present. */
export function total(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0)
}

export interface HeadlineCount {
  id: string
  /** Where the card's "View all" goes, or null when no screen can list these records. */
  to: string | null
  value: number
  /** The status split behind the headline, when the statistic carries one. */
  breakdown: Record<string, number> | null
  /** Which state machine the breakdown's keys belong to — tones resolve per machine. */
  machine: StatisticMachine | null
}

/**
 * The headline cards, in the approved layout's order.
 *
 * <p>Backend Phase B6 closed both gaps this function used to document. **Students** now has a real
 * source — {@code studentProfiles} counts student profiles rather than accounts, which is why the
 * card beside it is labelled "Total accounts" and not "users". **Internships** now has a list screen
 * behind it, so its "View all" goes somewhere instead of being omitted to avoid a 403.
 *
 * <p>Applications and placements still have no platform-wide list endpoint, so they carry a real
 * total and a real status breakdown rather than a link that would 404.
 */
export function headlineCounts(statistics: PlatformStatistics): HeadlineCount[] {
  return [
    {
      id: 'users',
      to: '/admin/users',
      value: total(statistics.usersByStatus),
      breakdown: statistics.usersByStatus,
      machine: 'accounts',
    },
    {
      // Backend Phase B6. Student PROFILES, not accounts — a recruiter has an account and is not a
      // student. No list screen: there is no platform-wide student endpoint, and B6 did not add one.
      id: 'students',
      to: null,
      value: statistics.studentProfiles,
      breakdown: statistics.studentEnrollmentsByVerificationStatus,
      machine: 'enrollments',
    },
    {
      id: 'universities',
      to: '/admin/universities',
      value: statistics.universities,
      // Backend Phase B6 gave universities the breakdown organizations always had.
      breakdown: statistics.universitiesByVerificationStatus,
      machine: 'institutions',
    },
    {
      id: 'organizations',
      to: '/admin/organizations',
      value: total(statistics.organizationsByVerificationStatus),
      breakdown: statistics.organizationsByVerificationStatus,
      machine: 'institutions',
    },
    {
      // Applications is a plain scalar — {@code candidacies} has no GROUP BY behind it.
      id: 'candidacies',
      to: null,
      value: statistics.candidacies,
      breakdown: null,
      machine: null,
    },
    {
      // Backend Phase B6: the total is every opportunity in any state, and the screen behind the
      // link shows them the same way. The subset the public can actually see is a different figure
      // — see publiclyDiscoverableOpportunities, reported separately rather than blended in here.
      id: 'opportunities',
      to: '/admin/opportunities',
      value: total(statistics.opportunitiesByStatus),
      breakdown: statistics.opportunitiesByStatus,
      machine: 'opportunities',
    },
    {
      id: 'placements',
      to: null,
      value: total(statistics.placementsByStatus),
      breakdown: statistics.placementsByStatus,
      machine: 'placements',
    },
  ]
}

/**
 * How many opportunities the public can actually find right now (Backend Phase B6).
 *
 * <p>Kept OUT of {@link headlineCounts} on purpose. It is not a seventh population to count — it is a
 * qualifier on the opportunities card, and showing it as a peer would invite reading the two totals
 * as separate things that add up. The gap between this and the PUBLISHED key of
 * {@code opportunitiesByStatus} is the number of listings Backend Phase B1.5 hides: targeted-only
 * ones, and ones whose organization has since been suspended.
 */
export function publiclyDiscoverable(statistics: PlatformStatistics): {
  discoverable: number
  published: number
  hidden: number
} {
  const published = statistics.opportunitiesByStatus.PUBLISHED ?? 0
  const discoverable = statistics.publiclyDiscoverableOpportunities
  return { discoverable, published, hidden: Math.max(published - discoverable, 0) }
}

/**
 * Institutions still waiting on a reviewer, from the organization breakdown.
 *
 * <p>{@code SUBMITTED} and {@code UNDER_REVIEW} are the two states where the ball is on the
 * platform's side of the net; every other state is waiting on the institution or is finished.
 */
export function pendingInstitutionReviews(counts: Record<string, number>): number {
  return (counts.SUBMITTED ?? 0) + (counts.UNDER_REVIEW ?? 0)
}

/**
 * Phase 8: what needs a platform operator, as work items with a destination. Only real queues with a
 * screen behind them, each linking to that screen already filtered; zero-count items are left out,
 * so an empty list is the honest "caught up". Failed email and sign-in failures have no screen and
 * are reported as system signals instead ({@link systemSignals}), never as a link to nowhere.
 *
 * <p>`pendingTestimonials` is the SUBMITTED total from the moderation list, or undefined when it is
 * not loaded — then it simply contributes nothing.
 */
export type PlatformAttentionKind =
  | 'organizationReviews'
  | 'universityReviews'
  | 'escalatedCases'
  | 'openPrivacyRequests'
  | 'pendingTestimonials'

export interface PlatformAttention {
  kind: PlatformAttentionKind
  count: number
  to: string
}

export function platformAttention(statistics: PlatformStatistics, pendingTestimonials?: number): PlatformAttention[] {
  const items: PlatformAttention[] = [
    { kind: 'organizationReviews', count: pendingInstitutionReviews(statistics.organizationsByVerificationStatus), to: '/admin/organizations' },
    { kind: 'universityReviews', count: pendingInstitutionReviews(statistics.universitiesByVerificationStatus), to: '/admin/universities' },
    { kind: 'escalatedCases', count: statistics.escalatedVerificationCases, to: '/admin/verification-escalations' },
    { kind: 'openPrivacyRequests', count: statistics.openPrivacyRequests, to: '/admin/privacy-requests' },
    { kind: 'pendingTestimonials', count: pendingTestimonials ?? 0, to: '/admin/testimonials' },
  ]
  return items.filter((item) => item.count > 0)
}

/** At most four operational figures, each a real count from the statistics endpoint. */
export function platformHealth(statistics: PlatformStatistics) {
  return {
    activeAccounts: statistics.usersByStatus.ACTIVE ?? 0,
    verifiedInstitutions: (statistics.organizationsByVerificationStatus.VERIFIED ?? 0) + (statistics.universitiesByVerificationStatus.VERIFIED ?? 0),
    discoverableInternships: statistics.publiclyDiscoverableOpportunities,
    activePlacements: statistics.placementsByStatus.ACTIVE ?? 0,
  }
}

/**
 * Signals to watch rather than queues to clear: failed email deliveries (a real fault when non-zero)
 * and recent sign-in failures (some every day is normal, so it is never an alarm).
 */
export function systemSignals(statistics: PlatformStatistics) {
  return [
    { id: 'failedEmails', value: statistics.failedEmailDeliveries, tone: (statistics.failedEmailDeliveries > 0 ? 'danger' : 'success') as StatusTone },
    { id: 'recentLoginFailures', value: statistics.recentLoginFailures, tone: 'info' as StatusTone },
  ]
}
