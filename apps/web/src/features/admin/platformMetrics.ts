import type { StatusTone } from '../../components/ui'
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
    },
    {
      // Backend Phase B6. Student PROFILES, not accounts — a recruiter has an account and is not a
      // student. No list screen: there is no platform-wide student endpoint, and B6 did not add one.
      id: 'students',
      to: null,
      value: statistics.studentProfiles,
      breakdown: null,
    },
    {
      id: 'universities',
      to: '/admin/universities',
      value: statistics.universities,
      // Backend Phase B6 gave universities the breakdown organizations always had.
      breakdown: statistics.universitiesByVerificationStatus,
    },
    {
      id: 'organizations',
      to: '/admin/organizations',
      value: total(statistics.organizationsByVerificationStatus),
      breakdown: statistics.organizationsByVerificationStatus,
    },
    {
      // Applications is a plain scalar — {@code candidacies} has no GROUP BY behind it.
      id: 'candidacies',
      to: null,
      value: statistics.candidacies,
      breakdown: null,
    },
    {
      // Backend Phase B6: the total is every opportunity in any state, and the screen behind the
      // link shows them the same way. The subset the public can actually see is a different figure
      // — see publiclyDiscoverableOpportunities, reported separately rather than blended in here.
      id: 'opportunities',
      to: '/admin/opportunities',
      value: total(statistics.opportunitiesByStatus),
      breakdown: statistics.opportunitiesByStatus,
    },
    {
      id: 'placements',
      to: null,
      value: total(statistics.placementsByStatus),
      breakdown: statistics.placementsByStatus,
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

export interface AttentionItem {
  id: string
  value: number
  /** Where the work is done, when a screen exists for it. */
  to: string | null
  tone: StatusTone
  /** A figure to watch rather than a queue to clear — it never reads as "needs action". */
  informational?: boolean
}

/**
 * The operations strip: the four figures that mean somebody has to do something today.
 *
 * <p>Not in the prototype, which was drawn as a growth dashboard. These are the reason the console
 * exists — {@code PlatformStatistics} carries all four precisely because Phase 7 treated them as the
 * platform's health, and a console that showed totals but hid a mail outage would be decoration.
 *
 * <p>Tone is severity, not decoration: zero is the healthy state for every one of them, so a
 * non-zero value is always worth the eye. Failed email and login failures have no screen to link to
 * — nothing in the API lists them — so they read as indicators rather than pretending to be links.
 */
export function attentionItems(statistics: PlatformStatistics): AttentionItem[] {
  return [
    {
      id: 'escalatedCases',
      value: statistics.escalatedVerificationCases,
      to: '/admin/verification-escalations',
      tone: statistics.escalatedVerificationCases > 0 ? 'warning' : 'success',
    },
    {
      id: 'openPrivacyRequests',
      value: statistics.openPrivacyRequests,
      to: '/admin/privacy-requests',
      tone: statistics.openPrivacyRequests > 0 ? 'warning' : 'success',
    },
    {
      id: 'failedEmails',
      value: statistics.failedEmailDeliveries,
      to: null,
      tone: statistics.failedEmailDeliveries > 0 ? 'danger' : 'success',
    },
    {
      // Never "needs action": some failed sign-ins every day is normal, and calling that an alarm
      // would train an administrator to ignore this strip. It is here to be watched, not worked.
      id: 'recentLoginFailures',
      value: statistics.recentLoginFailures,
      to: null,
      tone: 'info',
      informational: true,
    },
  ]
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
