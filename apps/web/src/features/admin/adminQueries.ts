import { queryOptions, type QueryClient } from '@tanstack/react-query'
import * as adminApi from './api/adminApi'
import type { InstitutionVerificationStatus, UserStatus } from './types'
import type { PrivacyRequestState } from '../privacy/types'
import type { TestimonialStatus } from '../testimonials/types'

/**
 * The platform console's server state, defined once (Phase 8).
 *
 * <p>The keys are the ones the console already used — the dashboard's queue cards and each list page
 * now read the SAME entries, so a reviewer who opens the queue after the dashboard gets it from cache
 * and a decision on a record refreshes both. Every key sits under its record's prefix
 * (`['admin', 'organizations', …]`), so invalidating the prefix after a command refreshes the list,
 * the record and the dashboard's view of it together.
 */
export const adminQueries = {
  statistics: () => queryOptions({ queryKey: ['admin', 'statistics'] as const, queryFn: adminApi.getStatistics, retry: false }),
  organizations: (status: InstitutionVerificationStatus | '', query = '', page = 0) =>
    queryOptions({
      queryKey: ['admin', 'organizations', status, query, page] as const,
      queryFn: () => adminApi.listOrganizations({ status: status || undefined, query: query || undefined, page }),
    }),
  organization: (organizationId: string) =>
    queryOptions({ queryKey: ['admin', 'organizations', 'detail', organizationId] as const, queryFn: () => adminApi.getOrganization(organizationId) }),
  universities: (status: InstitutionVerificationStatus | '', query = '', page = 0) =>
    queryOptions({
      queryKey: ['admin', 'universities', status, query, page] as const,
      queryFn: () => adminApi.listUniversities({ status: status || undefined, query: query || undefined, page }),
    }),
  university: (universityId: string) =>
    queryOptions({ queryKey: ['admin', 'universities', 'detail', universityId] as const, queryFn: () => adminApi.getUniversity(universityId) }),
  users: (query = '', status: UserStatus | '' = '', page = 0) =>
    queryOptions({
      queryKey: ['admin', 'users', query, status, page] as const,
      queryFn: () => adminApi.searchUsers({ query: query || undefined, status: status || undefined, page }),
    }),
  user: (userId: string) => queryOptions({ queryKey: ['admin', 'users', 'detail', userId] as const, queryFn: () => adminApi.getUser(userId) }),
  platformRoles: () => queryOptions({ queryKey: ['admin', 'platform-roles'] as const, queryFn: adminApi.listPlatformRoles }),
  privacyRequests: (state: PrivacyRequestState | '', page = 0) =>
    queryOptions({
      queryKey: ['admin', 'privacy-requests', state, page] as const,
      queryFn: () => adminApi.listPrivacyRequests({ state: state || undefined, page }),
    }),
  testimonials: (status: TestimonialStatus | '', page = 0) =>
    queryOptions({
      queryKey: ['admin', 'testimonials', status, page] as const,
      queryFn: () => adminApi.listTestimonials({ status: status || undefined, page }),
    }),
}

/** After a verification command: the institution's lists and record, and the dashboard counts. */
export function invalidateInstitution(queryClient: QueryClient, kind: 'organizations' | 'universities') {
  void queryClient.invalidateQueries({ queryKey: ['admin', kind] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
}
