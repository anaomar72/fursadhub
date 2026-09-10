import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const INTERNSHIP = 'src/features/opportunities/pages/PublicOpportunityDetailPage.tsx'
const ORGANIZATION = 'src/features/organization/pages/PublicOrganizationProfilePage.tsx'
const UNIVERSITY = 'src/features/university/pages/PublicUniversityProfilePage.tsx'

/**
 * The public detail pages participate in the reveal system — and two things about HOW they do are
 * load-bearing enough to pin, because breaking either produces a bug that looks like a styling
 * quirk rather than a mistake.
 */
describe('public detail pages use the shared reveal', () => {
  it.each([
    ['internship', INTERNSHIP],
    ['organization', ORGANIZATION],
    ['university', UNIVERSITY],
  ])('%s detail composes with <Reveal>', (_name, path) => {
    const file = source(path)
    expect(file).toMatch(/import \{[^}]*\bReveal\b[^}]*\} from/)
    expect(file).toContain('<Reveal')
  })

  /*
   * `position: sticky` resolves against the nearest ancestor with a transform, not the viewport.
   * Wrapping the apply rail — or anything above it — in a Reveal would silently turn the sticky
   * column into a static one, and the symptom (rail scrolls away) looks nothing like the cause.
   */
  it('never wraps the internship apply rail, which is sticky', () => {
    const file = source(INTERNSHIP)
    const asideStart = file.indexOf('<aside')
    const asideEnd = file.indexOf('</aside>', asideStart)
    expect(asideStart).toBeGreaterThan(-1)
    expect(asideEnd).toBeGreaterThan(asideStart)
    expect(file.slice(asideStart, asideEnd)).not.toContain('<Reveal')
    // And the rail is still declared sticky, so the constraint above is a real one.
    expect(file.slice(asideStart, asideStart + 200)).toContain('sticky')
  })

  /*
   * The overlapping crest/logo sits half over the cover banner. Animating that composition means
   * the mark visibly slides across the banner on every load, which reads as a broken layout.
   */
  it.each([
    ['organization', ORGANIZATION],
    ['university', UNIVERSITY],
  ])('%s detail leaves the cover and overlapping identity row unanimated', (_name, path) => {
    const file = source(path)
    const bannerAt = file.indexOf('<ProfileBanner')
    expect(bannerAt).toBeGreaterThan(-1)
    const firstReveal = file.indexOf('<Reveal')
    expect(firstReveal).toBeGreaterThan(bannerAt)
  })
})
