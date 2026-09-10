import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../../src/lib/i18n'
import { buildAdminNav } from '../../../src/features/admin/components/adminNavigation'
import type { PlatformRole } from '../../../src/features/admin/types'

function destinations(roles: PlatformRole[]): string[] {
  return buildAdminNav(i18n.t, { platformAdmin: roles.length > 0, roles }).flatMap((section) =>
    section.items.map((item) => item.to),
  )
}

describe('buildAdminNav', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('gives a super admin the whole platform menu', () => {
    expect(destinations(['SUPER_ADMIN'])).toEqual(
      expect.arrayContaining([
        '/admin/dashboard',
        '/admin/organizations',
        '/admin/universities',
        '/admin/verification-escalations',
        '/admin/users',
        '/admin/platform-roles',
        '/admin/privacy-requests',
        '/admin/legal-documents',
        '/admin/audit',
      ]),
    )
  })

  it('gives a verification officer only the institution queues', () => {
    const items = destinations(['VERIFICATION_OFFICER'])

    expect(items).toContain('/admin/organizations')
    expect(items).toContain('/admin/universities')
    expect(items).toContain('/admin/verification-escalations')

    for (const superAdminOnly of [
      '/admin/dashboard',
      '/admin/users',
      '/admin/platform-roles',
      '/admin/privacy-requests',
      '/admin/legal-documents',
      '/admin/audit',
    ]) {
      expect(items).not.toContain(superAdminOnly)
    }
  })
})
