import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../../src/lib/i18n'
import { buildOrganizationNav } from '../../../src/features/organization/components/organizationNavigation'
import type { MyOrganizationMembershipResponse, OrganizationRole } from '../../../src/features/organization/types'

function membership(role: OrganizationRole): MyOrganizationMembershipResponse {
  return { organizationId: 'org-1', role }
}

function destinations(sections: ReturnType<typeof buildOrganizationNav>): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.to))
}

function sectionLabels(sections: ReturnType<typeof buildOrganizationNav>): (string | undefined)[] {
  return sections.map((section) => section.label)
}

describe('buildOrganizationNav', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('gives an organization admin the full menu', () => {
    const items = destinations(buildOrganizationNav(i18n.t, membership('ORGANIZATION_ADMIN')))

    expect(items).toEqual(
      expect.arrayContaining([
        '/organization/dashboard',
        '/organization/opportunities',
        '/organization/candidates',
        '/organization/placements',
        '/organization/partners',
        '/organization/profile',
        '/organization/staff',
      ]),
    )
  })

  it('never offers staff provisioning to a recruiter or a supervisor', () => {
    // OrganizationMembershipService requires ORGANIZATION_ADMIN (CLAUDE.md section 26A).
    expect(destinations(buildOrganizationNav(i18n.t, membership('RECRUITER')))).not.toContain('/organization/staff')
    expect(destinations(buildOrganizationNav(i18n.t, membership('ORGANIZATION_SUPERVISOR')))).not.toContain(
      '/organization/staff',
    )
  })

  it('gives a recruiter a recruitment workspace, not the admin menu minus its admin items', () => {
    const items = destinations(buildOrganizationNav(i18n.t, membership('RECRUITER')))

    // Everything recruiting: CreateOpportunityService and CandidacyAuthorization both admit the role.
    expect(items).toContain('/organization/opportunities')
    expect(items).toContain('/organization/candidates')
    expect(items).toContain('/organization/candidates?stage=SHORTLISTED')
    // PlacementAuthorization's managing roles include RECRUITER, so interns stay.
    expect(items).toContain('/organization/placements')
    // Nothing that administers the organization itself.
    expect(items).not.toContain('/organization/staff')
    expect(items).not.toContain('/organization/partners')
  })

  it('gives a recruiter no "Manage" group at all, rather than an empty heading', () => {
    const recruiter = buildOrganizationNav(i18n.t, membership('RECRUITER'))
    const admin = buildOrganizationNav(i18n.t, membership('ORGANIZATION_ADMIN'))

    expect(sectionLabels(recruiter)).not.toContain('Manage')
    expect(sectionLabels(admin)).toContain('Manage')
  })

  it('offers the shortlist as a stage of the real pool, not a separate route', () => {
    // FursadHub has no shortlist entity — being shortlisted IS the SHORTLISTED candidacy status
    // (CLAUDE.md section 37), so the destination is that status pinned on the candidates page.
    const items = destinations(buildOrganizationNav(i18n.t, membership('RECRUITER')))
    const shortlist = items.find((to) => to.includes('stage='))

    expect(shortlist).toBe('/organization/candidates?stage=SHORTLISTED')
    expect(items).not.toContain('/organization/shortlist')
  })

  it('keeps the organization record reachable for every role, but only admins under Manage', () => {
    // OrganizationQueryService.getForMember admits any active member, so everyone can READ it;
    // only UpdateOrganizationService's admin can change it, so only they get it as something to
    // manage. For the others it sits with their own account as a read-only reference.
    for (const role of ['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR'] as OrganizationRole[]) {
      expect(destinations(buildOrganizationNav(i18n.t, membership(role)))).toContain('/organization/profile')
    }

    const recruiter = buildOrganizationNav(i18n.t, membership('RECRUITER'))
    const manage = recruiter.find((section) => section.label === 'Manage')
    expect(manage).toBeUndefined()
  })

  it('gives every role their own account destinations', () => {
    for (const role of ['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR'] as OrganizationRole[]) {
      const items = destinations(buildOrganizationNav(i18n.t, membership(role)))
      expect(items).toContain('/account/notifications')
      expect(items).toContain('/account/profile')
    }
  })

  it('gives a supervisor a focused menu, not the admin menu with items removed', () => {
    // CandidacyAuthorization refuses the role outright, and opportunity authoring does too, so
    // offering either destination would be offering a guaranteed 403.
    const items = destinations(buildOrganizationNav(i18n.t, membership('ORGANIZATION_SUPERVISOR')))

    expect(items).toContain('/organization/dashboard')
    expect(items).toContain('/organization/placements')
    expect(items).not.toContain('/organization/candidates')
    expect(items).not.toContain('/organization/candidates?stage=SHORTLISTED')
    expect(items).not.toContain('/organization/opportunities')
    expect(items).not.toContain('/organization/partners')
    expect(items).not.toContain('/organization/staff')
  })

  it('translates its labels rather than hardcoding English', async () => {
    await i18n.changeLanguage('so')
    const labels = buildOrganizationNav(i18n.t, membership('ORGANIZATION_ADMIN')).flatMap((section) =>
      section.items.map((item) => item.label),
    )

    expect(labels).toContain('Tababarayaasha')
    expect(labels).toContain('Jaamacadaha iskaashiga')
    expect(labels).not.toContain('Interns')
    expect(labels).not.toContain('University partners')
  })

  it('translates the recruiter menu too', async () => {
    await i18n.changeLanguage('so')
    const labels = buildOrganizationNav(i18n.t, membership('RECRUITER')).flatMap((section) =>
      section.items.map((item) => item.label),
    )

    expect(labels).toContain('Liiska kooban')
    expect(labels).toContain('Musharrixiinta')
    expect(labels).not.toContain('Shortlist')
    expect(labels).not.toContain('Candidates')
  })
})
