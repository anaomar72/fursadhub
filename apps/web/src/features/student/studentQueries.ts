import { queryOptions } from '@tanstack/react-query'
import * as studentApi from './api/studentApi'
import * as recruitmentApi from '../recruitment/api/recruitmentApi'
import * as placementsApi from '../placements/api/placementsApi'
import { ApiError } from '../../lib/api/client'

/**
 * The student's own server state, defined ONCE.
 *
 * <p>The dashboard, the applications and nominations pages, the opportunity pages and the account
 * shell all read the same few `/students/me/...` endpoints. Sharing one key per endpoint is what
 * lets TanStack Query serve them from one cache entry: the nominations page used to cache under
 * `['recruitment', 'my-nominations']` while the dashboard used `['student', 'nominations']`, so the
 * same list was fetched twice and accepting a nomination left the other copy stale.
 *
 * <p>`retry: false` on the profile and enrollment: a 404 there is the ordinary answer for "not
 * created yet", not a failure worth retrying.
 */
export const studentQueries = {
  profile: () => queryOptions({ queryKey: ['student', 'profile'] as const, queryFn: studentApi.getMyProfile, retry: false }),
  enrollment: () =>
    queryOptions({ queryKey: ['student', 'enrollment'] as const, queryFn: studentApi.getMyEnrollment, retry: false }),
  candidacies: () => queryOptions({ queryKey: ['student', 'candidacies'] as const, queryFn: recruitmentApi.listMyCandidacies }),
  nominations: () => queryOptions({ queryKey: ['student', 'nominations'] as const, queryFn: recruitmentApi.listMyNominations }),
  placements: () => queryOptions({ queryKey: ['student', 'placements'] as const, queryFn: placementsApi.listMyPlacements }),
  /** The backend-computed checklist for one placement — the same key CompletionPanel uses. */
  completion: (placementId: string) =>
    queryOptions({
      queryKey: ['placement-completion', placementId] as const,
      queryFn: () => placementsApi.getCompletionStatus(placementId),
    }),
}

/** "Not created yet": the profile and enrollment endpoints answer 404 for a new account. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.body.status === 404
}
