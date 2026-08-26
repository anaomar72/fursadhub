import { createContext, useContext } from 'react'
import type { AdminSession } from '../types'

export const AdminSessionContext = createContext<AdminSession | null>(null)

/**
 * The caller's resolved platform roles, for use inside {@code AdminAreaLayout}.
 *
 * <p>For deciding what to RENDER, never what to permit. The backend re-authorizes every request
 * against current PostgreSQL data (CLAUDE.md section 24).
 */
export function useAdminSession(): AdminSession {
  const session = useContext(AdminSessionContext)
  if (!session) {
    throw new Error('useAdminSession must be used within AdminAreaLayout')
  }
  return session
}
