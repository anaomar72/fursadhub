import { test, expect, type Page } from '@playwright/test'

/**
 * Responsive and accessibility floor for the public surfaces.
 *
 * <p>Section 13 of CLAUDE.md asks for real behaviour between 320px and very wide, not a handful of
 * pinned breakpoints, and section 16 makes accessibility a release requirement rather than a later
 * pass. These assertions cover the properties that are cheap to check and expensive to notice by
 * eye: nothing scrolls sideways, every control can be reached and named, the heading spine is
 * sound, and a visitor who asks for reduced motion actually gets a still page.
 */
// The real public paths — the header's "Internships" link points at /opportunities.
const ROUTES = ['/', '/about', '/opportunities', '/organizations', '/universities', '/login', '/register']

// Deliberately not only the common device widths: 320 is the narrowest phone still in use, 430 the
// widest, and the two between them catch a layout that only works at the sizes it was built against.
const WIDTHS = [320, 360, 390, 430, 768, 1024, 1440, 1920]

test.describe('responsive', () => {
  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const offenders: string[] = []
      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: 'networkidle' })
        await page.waitForTimeout(400)
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth)
        if (overflow > 0) {
          // Name the widest element, so a failure points at the cause rather than the symptom.
          const culprit = await page.evaluate((limit) => {
            for (const el of document.querySelectorAll<HTMLElement>('body *')) {
              const r = el.getBoundingClientRect()
              if (r.right > limit + 1 || r.left < -1) {
                return `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 60)}`
              }
            }
            return 'unknown'
          }, width)
          offenders.push(`${route} overflows by ${overflow}px (${culprit})`)
        }
      }
      expect(offenders, `pages scrolling sideways at ${width}px`).toEqual([])
    })
  }
})

async function auditA11y(page: Page, route: string): Promise<string[]> {
  await page.goto(route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  return page.evaluate(() => {
    const problems: string[] = []

    // One h1, and no level skipped on the way down — the spine a screen reader navigates by.
    const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => Number(h.tagName[1]))
    const h1s = levels.filter(l => l === 1).length
    if (h1s !== 1) problems.push(`expected exactly one h1, found ${h1s}`)
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) problems.push(`heading jumps h${levels[i - 1]} -> h${levels[i]}`)
    }

    // Every control reachable by a screen reader needs a name.
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea')) {
      if (el.closest('[aria-hidden="true"]') || (el as HTMLInputElement).type === 'hidden') continue
      const labelled =
        el.getAttribute('aria-label')?.trim() ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title')?.trim() ||
        (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent?.trim()) ||
        el.closest('label')?.textContent?.trim() ||
        el.textContent?.trim() ||
        (el as HTMLInputElement).placeholder?.trim()
      if (!labelled) problems.push(`unnamed ${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).slice(0, 40) : ''}`)
    }

    // A decorative image is silent; a meaningful one is described. Neither may be undeclared.
    for (const img of document.querySelectorAll('img')) {
      if (img.getAttribute('alt') === null) problems.push(`img without alt: ${img.currentSrc || img.src}`)
    }

    // The landmark a skip link jumps to.
    if (!document.querySelector('main')) problems.push('no <main> landmark')
    return problems
  })
}

test.describe('accessibility', () => {
  for (const route of ROUTES) {
    test(`semantics on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      const problems = await auditA11y(page, route)
      console.log(`A11Y ${route}: ${problems.length ? problems.join(' | ') : 'clean'}`)
      expect(problems, `accessibility problems on ${route}`).toEqual([])
    })
  }

  test('the 404 page carries a main landmark of its own', async ({ page }) => {
    // It renders standalone, outside the layouts that supply the landmark everywhere else, so it
    // was the one page in the product a screen reader had no <main> to jump to.
    await page.setViewportSize({ width: 1440, height: 900 })
    const problems = await auditA11y(page, '/no-such-page-exists-here')
    console.log('A11Y 404: ' + (problems.length ? problems.join(' | ') : 'clean'))
    expect(problems, 'accessibility problems on the 404 page').toEqual([])
  })

  test('reduced motion actually stills the page', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    // Not "an animation is declared" — whether anything is still MOVING. A visitor who asks for
    // reduced motion should find the page settled, whatever the stylesheet says.
    const moving = await page.evaluate(() =>
      document.getAnimations()
        .filter(a => a.playState === 'running')
        .map(a => (a.effect as KeyframeEffect | null)?.target?.tagName ?? 'unknown'))
    expect(moving, 'animations still running under prefers-reduced-motion').toEqual([])
    await context.close()
  })
})
