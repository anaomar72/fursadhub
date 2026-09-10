import { describe, expect, it } from 'vitest'
import { findActiveNavItem, isNavItemActive, type NavItem } from '../../../src/app/layouts/navigation'

const candidates: NavItem = { to: '/organization/candidates', label: 'Candidates', icon: 'users', end: true }
const shortlist: NavItem = {
  to: '/organization/candidates?stage=SHORTLISTED',
  label: 'Shortlist',
  icon: 'userCheck',
}
const placements: NavItem = { to: '/organization/placements', label: 'Interns', icon: 'badgeCheck' }
const siblings = [candidates, shortlist, placements]

function at(pathname: string, search = ''): { pathname: string; search: string } {
  return { pathname, search }
}

/**
 * React Router's own NavLink compares pathnames and ignores the query string, which would light up
 * "Candidates" and "Shortlist" together — they share a path and differ only by `?stage=`.
 */
describe('isNavItemActive', () => {
  it('marks the plain list active when no stage is pinned', () => {
    expect(isNavItemActive(candidates, at('/organization/candidates'), siblings)).toBe(true)
    expect(isNavItemActive(shortlist, at('/organization/candidates'), siblings)).toBe(false)
  })

  it('hands the highlight to the filtered item when its stage is pinned', () => {
    const location = at('/organization/candidates', '?stage=SHORTLISTED')

    expect(isNavItemActive(shortlist, location, siblings)).toBe(true)
    expect(isNavItemActive(candidates, location, siblings)).toBe(false)
  })

  it('does not match a filtered item on a different stage', () => {
    const location = at('/organization/candidates', '?stage=OFFERED')

    expect(isNavItemActive(shortlist, location, siblings)).toBe(false)
    // The plain list yields only to a sibling that actually matches, so it takes the highlight back.
    expect(isNavItemActive(candidates, location, siblings)).toBe(true)
  })

  it('tolerates extra parameters the user added', () => {
    // A search term or a second filter alongside the pinned stage must not break the match.
    const location = at('/organization/candidates', '?stage=SHORTLISTED&q=amina')
    expect(isNavItemActive(shortlist, location, siblings)).toBe(true)
  })

  it('still matches child routes for a non-exact item', () => {
    expect(isNavItemActive(placements, at('/organization/placements/plc-1'), siblings)).toBe(true)
    // `end` items match their own path only.
    expect(isNavItemActive(candidates, at('/organization/candidates/extra'), siblings)).toBe(false)
  })

  it('never matches an unrelated path', () => {
    expect(isNavItemActive(candidates, at('/organization/opportunities'), siblings)).toBe(false)
    expect(isNavItemActive(shortlist, at('/organization/opportunities'), siblings)).toBe(false)
  })
})

describe('findActiveNavItem', () => {
  const sections = [{ items: [candidates, shortlist, placements] }]

  it('resolves the topbar label to the pinned filter when one is open', () => {
    expect(findActiveNavItem(sections, at('/organization/candidates', '?stage=SHORTLISTED'))?.label).toBe('Shortlist')
  })

  it('resolves to the plain list otherwise', () => {
    expect(findActiveNavItem(sections, at('/organization/candidates'))?.label).toBe('Candidates')
  })

  it('resolves a detail route to its parent destination', () => {
    expect(findActiveNavItem(sections, at('/organization/placements/plc-1'))?.label).toBe('Interns')
  })

  it('returns nothing for a path the menu does not cover', () => {
    expect(findActiveNavItem(sections, at('/account/profile'))).toBeUndefined()
  })
})
