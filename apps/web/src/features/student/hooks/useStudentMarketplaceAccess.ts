import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth/AuthContext'
import { apiFetch } from '../../../lib/api/client'

/** Fail closed while current database authority is loading or unavailable. */
export function useStudentMarketplaceAccess() {
  const { isAuthenticated, accessToken, isInitializing } = useAuth()
  const query = useQuery({
    queryKey: ['student-marketplace-access', accessToken],
    queryFn: () => apiFetch<{ studentActions: boolean }>('/students/me/marketplace-access'),
    enabled: isAuthenticated && !isInitializing,
    retry: false,
  })
  return {
    isAuthenticated,
    canAct: isAuthenticated && !isInitializing && query.data?.studentActions === true,
    isLoading: isInitializing || (isAuthenticated && query.isPending),
  }
}
