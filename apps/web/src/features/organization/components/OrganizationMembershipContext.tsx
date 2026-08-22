import { createContext, useContext } from 'react'
import type { MyOrganizationMembershipResponse } from '../types'

export const OrganizationMembershipContext = createContext<MyOrganizationMembershipResponse | null>(null)

/** Only for use inside {@code OrganizationAreaLayout} — the caller's own resolved staff membership. */
export function useOrganizationMembership(): MyOrganizationMembershipResponse {
  const membership = useContext(OrganizationMembershipContext)
  if (!membership) {
    throw new Error('useOrganizationMembership must be used within OrganizationAreaLayout')
  }
  return membership
}
