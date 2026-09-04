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
 * The six headline cards, in the approved layout's order.
 *
 * <p>Two of the prototype's cards are deliberately not here. **Students** has no backend source:
 * {@link PlatformStatistics} counts accounts by status, not student profiles, and there is no
 * platform-wide student endpoint anywhere in the API. **Internships** and **Applications** DO have
 * real counts, but no list screen can exist behind them — platform-admin authorization appears only
 * in the administration, compliance and verification-evidence services, so Super Admin has no
 * platform-wide opportunity, candidacy or placement query to page through. Those cards therefore
 * carry a real total and a real status breakdown instead of a "View all" that would 403.
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
      id: 'universities',
      to: '/admin/universities',
      value: statistics.universities,
      breakdown: null,
    },
    {
      id: 'organizations',
      to: '/admin/organizations',
      value: total(statistics.organizationsByVerificationStatus),
      breakdown: statistics.organizationsByVerificationStatus,
    },
    {
      // Applications is a plain scalar — {@code candidacies} has no GROUP BY behind it — so it sits
      // in the compact row. The two cards that DO carry a breakdown get the wide row, where there
      // is room to show it.
      id: 'candidacies',
      to: null,
      value: statistics.candidacies,
      breakdown: null,
    },
    {
      id: 'opportunities',
      to: null,
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
