import { createContext, useContext } from 'react'
import type { MyMembershipResponse } from '../types'

export const UniversityMembershipContext = createContext<MyMembershipResponse | null>(null)

/** Only for use inside {@code UniversityAreaLayout} — the caller's own resolved staff membership. */
export function useUniversityMembership(): MyMembershipResponse {
  const membership = useContext(UniversityMembershipContext)
  if (!membership) {
    throw new Error('useUniversityMembership must be used within UniversityAreaLayout')
  }
  return membership
}
