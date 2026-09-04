import { describe, expect, it } from 'vitest'
import { adminCapabilities } from '../../../src/features/admin/adminCapabilities'
import type { PlatformRole } from '../../../src/features/admin/types'

const can = (roles: PlatformRole[]) => adminCapabilities({ platformAdmin: roles.length > 0, roles })

describe('adminCapabilities', () => {
  it('gives a super admin every platform capability', () => {
    expect(Object.values(can(['SUPER_ADMIN'])).every(Boolean)).toBe(true)
  })

  it('gives a verification officer review authority and nothing else', () => {
    const officer = can(['VERIFICATION_OFFICER'])

    // requireReviewer admits them.
    expect(officer.canReviewInstitutions).toBe(true)
    expect(officer.canReviewStudentCases).toBe(true)

    // requireSuperAdmin does not. An officer who could appoint administrators would be one.
    expect(officer.canReadStatistics).toBe(false)
    expect(officer.canAdministerAccounts).toBe(false)
    expect(officer.canManagePlatformRoles).toBe(false)
    expect(officer.canAdministerCompliance).toBe(false)
    expect(officer.canReadAuditTrail).toBe(false)
  })

  it('gives someone with no platform grant nothing at all', () => {
    expect(Object.values(can([])).some(Boolean)).toBe(false)
  })

  it('does not let an unrelated role smuggle in authority', () => {
    // Only the two roles in the enum mean anything; anything else fails closed.
    const bogus = can(['ORGANIZATION_ADMIN' as PlatformRole])
    expect(Object.values(bogus).some(Boolean)).toBe(false)
  })

  it('treats a super admin holding both grants the same as a super admin', () => {
    expect(can(['SUPER_ADMIN', 'VERIFICATION_OFFICER'])).toEqual(can(['SUPER_ADMIN']))
  })
})
