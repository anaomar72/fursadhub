import { describe, expect, it } from 'vitest'
import {
  ASSIGNABLE_ORGANIZATION_ROLES,
  organizationCapabilities,
} from '../../../src/features/organization/organizationCapabilities'
import type { MyOrganizationMembershipResponse, OrganizationRole } from '../../../src/features/organization/types'

function membership(role: OrganizationRole): MyOrganizationMembershipResponse {
  return { organizationId: 'org-1', role }
}

/**
 * These assertions restate the backend's rules. If one ever has to change, the server changed — and
 * the menu, the dashboard and the page bodies that all read from here change with it.
 */
describe('organizationCapabilities', () => {
  it('gives an organization admin everything the API grants the role', () => {
    const can = organizationCapabilities(membership('ORGANIZATION_ADMIN'))

    expect(can.canManageOpportunities).toBe(true)
    expect(can.canManageCandidates).toBe(true)
    expect(can.canManagePlacementLifecycle).toBe(true)
    expect(can.canManageStaff).toBe(true)
    expect(can.canEditProfile).toBe(true)
    expect(can.scopedToAssignedPlacements).toBe(false)
  })

  it('gives a recruiter the recruiting surface but not the organization itself', () => {
    // CreateOpportunityService/CandidacyAuthorization admit RECRUITER; UpdateOrganizationService
    // and OrganizationMembershipService require ORGANIZATION_ADMIN.
    const can = organizationCapabilities(membership('RECRUITER'))

    expect(can.canManageOpportunities).toBe(true)
    expect(can.canManageCandidates).toBe(true)
    expect(can.canManagePlacementLifecycle).toBe(true)
    expect(can.canManageStaff).toBe(false)
    expect(can.canEditProfile).toBe(false)
  })

  it('confines an organization supervisor to supervising', () => {
    const can = organizationCapabilities(membership('ORGANIZATION_SUPERVISOR'))

    // CandidacyAuthorization.RECRUITING_ROLES excludes the role outright — a supervisor never sees
    // the recruitment pipeline, not even read-only.
    expect(can.canManageCandidates).toBe(false)
    expect(can.canManageOpportunities).toBe(false)
    expect(can.canManagePlacementLifecycle).toBe(false)
    expect(can.canManageStaff).toBe(false)
    expect(can.canEditProfile).toBe(false)
    expect(can.scopedToAssignedPlacements).toBe(true)
  })

  it('never treats ORGANIZATION_ADMIN as an assignable role', () => {
    // OrganizationMembershipService.ASSIGNABLE_ROLES closes the path an admin could otherwise use
    // to mint another admin (CLAUDE.md section 23).
    expect(ASSIGNABLE_ORGANIZATION_ROLES).toEqual(['RECRUITER', 'ORGANIZATION_SUPERVISOR'])
    expect(ASSIGNABLE_ORGANIZATION_ROLES).not.toContain('ORGANIZATION_ADMIN')
  })
})
