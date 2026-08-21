import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingSpinner } from '../../components/ui'

/**
 * Authenticated-route foundation (CLAUDE.md section 61 Phase 1 scope). This is UX only, not a
 * security boundary — the backend independently enforces authentication/authorization on every
 * protected endpoint regardless of what the frontend router allows (CLAUDE.md section 24).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
