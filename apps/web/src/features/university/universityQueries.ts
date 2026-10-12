import { queryOptions } from '@tanstack/react-query'
import * as universityApi from './api/universityApi'
import * as recruitmentApi from '../recruitment/api/recruitmentApi'
import * as placementsApi from '../placements/api/placementsApi'

/**
 * The university portal's server state, defined ONCE (Phase 7).
 *
 * <p>The dashboards, the directory, the queues and the workflow pages read the same handful of list
 * endpoints, and had drifted onto different keys for the same data: placements were cached under
 * both `['university', 'placements', id]` and `['placements', 'university', id]`, target requests
 * and nominations under a `university` and a `recruitment` key each, departments under two keys,
 * and the verification queue under a key the case page never invalidated — so deciding a case
 * left the queue showing its old status. One key per endpoint fixes both the duplicate requests and
 * the stale copies.
 *
 * <p>The keys that other features already invalidate are kept as they were: lifecycle and
 * completion commands invalidate `['placements']`, and nominating invalidates
 * `['recruitment', ...]`, so those prefixes are the ones adopted here.
 *
 * <p>Nothing here widens access: every list arrives already scoped by the backend to the caller's
 * own university, departments or assigned placements (CLAUDE.md section 24).
 */
export const universityQueries = {
  detail: (universityId: string) =>
    queryOptions({
      queryKey: ['university', 'detail', universityId] as const,
      queryFn: () => universityApi.getUniversityDetail(universityId),
      retry: false,
    }),
  departments: (universityId: string) =>
    queryOptions({
      queryKey: ['departments', universityId] as const,
      queryFn: () => universityApi.listDepartments(universityId),
      retry: false,
    }),
  /** The directory. `departmentId` is the endpoint's only filter; '' means every department in scope. */
  students: (universityId: string, departmentId = '') =>
    queryOptions({
      queryKey: ['university', 'students', universityId, departmentId] as const,
      queryFn: () => universityApi.listStudents(universityId, departmentId || undefined),
      retry: false,
    }),
  /** The verification queue. `status` is the endpoint's only filter; '' means every status. */
  verificationCases: (universityId: string, status = '') =>
    queryOptions({
      queryKey: ['university', 'verification-cases', universityId, status] as const,
      queryFn: () => universityApi.listVerificationQueue(universityId, status || undefined),
      retry: false,
    }),
  targetRequests: (universityId: string) =>
    queryOptions({
      queryKey: ['recruitment', 'target-requests', universityId] as const,
      queryFn: () => recruitmentApi.listTargetRequests(universityId),
      retry: false,
    }),
  nominations: (universityId: string) =>
    queryOptions({
      queryKey: ['recruitment', 'university-nominations', universityId] as const,
      queryFn: () => recruitmentApi.listUniversityNominations(universityId),
      retry: false,
    }),
  /** Admin: the whole university; coordinator: their departments; supervisor: their assignments. */
  placements: (universityId: string) =>
    queryOptions({
      queryKey: ['placements', 'university', universityId] as const,
      queryFn: () => placementsApi.listUniversityPlacements(universityId),
      retry: false,
    }),
}

/** Every key a verification decision can change: the case lists (all filters) and the directory. */
export const VERIFICATION_DEPENDENT_KEYS = [['university', 'verification-cases'], ['university', 'students']] as const
