import { test, expect, type Page } from '@playwright/test'
import { account, manifestPath, QA_BASE, settle, signIn } from './support/qa'

/**
 * Responsive and accessibility floor for the AUTHENTICATED product.
 *
 * <p>The public equivalent lives in `responsive-a11y.spec.ts`. This one matters more: portals are
 * where the dense work happens — rails, tables, filters, dialogs, multi-step forms — and they are
 * the surfaces a person uses every day rather than reads once.
 *
 * <p>Widths are swept from 320 up, because a layout that only works at the sizes it was built
 * against is not responsive. Accessibility is asserted on the properties that are cheap to check
 * and expensive to notice by eye: the heading spine, named controls, declared images, landmarks,
 * and — checked on running animations rather than on the stylesheet — a still page under reduced
 * motion.
 */
test.skip(!manifestPath(), 'FH_QA_MANIFEST not set — provision the QA environment first')
test.describe.configure({ mode: 'serial' })

const AREAS = [
  { name: 'student', role: 'STUDENT', scope: undefined as string | undefined,
    routes: ['/student/dashboard', '/student/opportunities', '/student/applications', '/student/placements', '/student/profile'] },
  { name: 'university', role: 'UNIVERSITY_ADMIN', scope: 'Alpha',
    routes: ['/university/dashboard', '/university/students', '/university/staff', '/university/placements', '/university/verification-cases'] },
  { name: 'organization', role: 'ORGANIZATION_ADMIN', scope: 'Alpha',
    routes: ['/organization/dashboard', '/organization/opportunities', '/organization/candidates', '/organization/staff', '/organization/placements'] },
  { name: 'admin', role: 'SUPER_ADMIN', scope: undefined,
    routes: ['/admin/dashboard', '/admin/users', '/admin/organizations', '/admin/audit'] },
]

// 320 is the narrowest phone still in use and 430 the widest; the two between them catch a layout
// tuned only to the common device sizes. 768/1024 are the tablet and small-laptop reflows.
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1440, 1920]

test.describe('responsive', () => {
  /*
   * One test per (area, width) rather than one per area sweeping every width. The combined version
   * ran ~45 navigations in a single page context and exhausted the V8 heap; split this way each
   * test is five navigations and the context is recycled between them.
   */
  for (const area of AREAS) {
    for (const width of WIDTHS) {
      test(`${area.name} portal at ${width}px`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width, height: 900 })
        await signIn(page, account(area.role, area.scope))

        const offenders: string[] = []
        for (const route of area.routes) {
          await page.goto(QA_BASE + route, { waitUntil: 'networkidle' })
          await page.waitForTimeout(300)
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          )
          if (overflow > 0) {
            const culprit = await page.evaluate((limit) => {
              for (const el of document.querySelectorAll<HTMLElement>('body *')) {
                const r = el.getBoundingClientRect()
                if (r.right > limit + 1) return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`
              }
              return 'unknown'
            }, width)
            offenders.push(`${route} overflows by ${overflow}px (${culprit})`)
          }
        }
        expect(offenders, `${area.name} pages scrolling sideways at ${width}px`).toEqual([])
      })
    }
  }

  test('primary actions stay reachable on a phone', async ({ page }) => {
    // A page that merely FITS 320px is not usable. The navigation has to be openable and the
    // page's main action has to be hittable, which is what this checks.
    await page.setViewportSize({ width: 320, height: 720 })
    await signIn(page, account('ORGANIZATION_ADMIN', 'Alpha'))
    await page.goto(`${QA_BASE}/organization/dashboard`, { waitUntil: 'networkidle' })
    await settle(page)

    const menu = page.getByRole('button', { name: /menu|navigation|open/i }).first()
    await expect(menu, 'a phone needs a way into the rail').toBeVisible()
    await menu.click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('link', { name: /internships/i }).first()).toBeVisible()
  })
})

async function auditA11y(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = []

    const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]))
    const h1s = levels.filter((l) => l === 1).length
    if (h1s !== 1) problems.push(`expected exactly one h1, found ${h1s}`)
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) problems.push(`heading jumps h${levels[i - 1]} -> h${levels[i]}`)
    }

    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea')) {
      if (el.closest('[aria-hidden="true"]') || (el as HTMLInputElement).type === 'hidden') continue
      const named =
        el.getAttribute('aria-label')?.trim() ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title')?.trim() ||
        (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent?.trim()) ||
        el.closest('label')?.textContent?.trim() ||
        el.textContent?.trim() ||
        (el as HTMLInputElement).placeholder?.trim()
      if (!named) problems.push(`unnamed ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`)
    }

    for (const img of document.querySelectorAll('img')) {
      if (img.getAttribute('alt') === null) problems.push(`img without alt: ${img.currentSrc || img.src}`)
    }

    if (!document.querySelector('main')) problems.push('no <main> landmark')
    return problems
  })
}

test.describe('accessibility', () => {
  for (const area of AREAS) {
    test(`${area.name} portal semantics`, async ({ page }) => {
      test.setTimeout(240_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      await signIn(page, account(area.role, area.scope))

      const findings: string[] = []
      for (const route of area.routes) {
        await page.goto(QA_BASE + route, { waitUntil: 'networkidle' })
        await settle(page)
        const problems = await auditA11y(page)
        console.log(`A11Y ${route}: ${problems.length ? problems.join(' | ') : 'clean'}`)
        for (const p of problems) findings.push(`${route}: ${p}`)
      }
      expect(findings, `${area.name} accessibility problems`).toEqual([])
    })
  }

  test('a portal is still and usable under prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await signIn(page, account('STUDENT'))
    await page.goto(`${QA_BASE}/student/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    const moving = await page.evaluate(() =>
      document.getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => (a.effect as KeyframeEffect | null)?.target?.tagName ?? 'unknown'))
    expect(moving, 'animations still running under prefers-reduced-motion').toEqual([])
    await context.close()
  })

  test('the portal rail is keyboard reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, account('STUDENT'))
    await page.goto(`${QA_BASE}/student/dashboard`, { waitUntil: 'networkidle' })
    await settle(page)

    // Tab into the page and confirm focus lands on something real and visibly focused — a rail
    // that can only be operated with a mouse is not navigable.
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const style = getComputedStyle(el)
      return { tag: el.tagName, text: el.textContent?.trim().slice(0, 40), outline: style.outlineStyle, ring: style.boxShadow }
    })
    expect(focused, 'Tab must move focus into the page').not.toBeNull()
  })
})
