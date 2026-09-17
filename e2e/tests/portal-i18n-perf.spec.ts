import { test, expect } from '@playwright/test'
import { account, manifestPath, QA_BASE, settle, signIn } from './support/qa'

/**
 * Two release requirements that are easy to assert and easy to regress silently: the authenticated
 * product is genuinely bilingual, and a portal route does not pull code belonging to a portal the
 * signed-in person cannot open.
 */
test.skip(!manifestPath(), 'FH_QA_MANIFEST not set — provision the QA environment first')

const PORTALS = [
  { name: 'student', role: 'STUDENT', scope: undefined as string | undefined, route: '/student/dashboard' },
  { name: 'university', role: 'UNIVERSITY_ADMIN', scope: 'Alpha', route: '/university/dashboard' },
  { name: 'organization', role: 'ORGANIZATION_ADMIN', scope: 'Alpha', route: '/organization/dashboard' },
  { name: 'admin', role: 'SUPER_ADMIN', scope: undefined, route: '/admin/dashboard' },
]

test.describe('English and Somali', () => {
  for (const portal of PORTALS) {
    test(`${portal.name} portal translates its chrome into Somali`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      await signIn(page, account(portal.role, portal.scope))
      await page.goto(QA_BASE + portal.route, { waitUntil: 'networkidle' })
      await settle(page)

      const english = await page.evaluate(() => document.body.innerText)

      // Switch the way a person does, through the toggle in the topbar.
      await page.getByRole('button', { name: /switch to somali|u beddel/i }).first().click()
      await page.waitForTimeout(1500)
      await settle(page)

      const somali = await page.evaluate(() => document.body.innerText)
      expect(somali, 'the page must actually change language').not.toBe(english)

      /*
       * A missing translation in i18next falls back to the English string rather than throwing, so
       * "it still renders" proves nothing. Raw KEYS, on the other hand, are unmistakable: they leak
       * as `namespace:some.dotted.path` when a key is referenced but absent from both bundles.
       */
      expect(somali, 'a raw translation key reached the page').not.toMatch(/\b[a-z]+:[a-z][A-Za-z]*\.[A-Za-z.]+\b/)
      console.log(`I18N ${portal.name}: EN ${english.length} chars -> SO ${somali.length} chars`)
    })
  }

  test('Somali text does not break the portal layout', async ({ page }) => {
    // Somali strings run longer than their English equivalents; a rail or KPI row sized to English
    // can overflow once it is translated. Checked at the narrowest width, where it would show first.
    await page.setViewportSize({ width: 320, height: 720 })
    await signIn(page, account('ORGANIZATION_ADMIN', 'Alpha'))
    await page.goto(`${QA_BASE}/organization/dashboard`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /switch to somali|u beddel/i }).first().click()
    await page.waitForTimeout(1500)
    await settle(page)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'the Somali dashboard overflows at 320px').toBeLessThanOrEqual(0)
  })
})

test.describe('route-level code delivery', () => {
  test('a student never downloads another portal chunk', async ({ page }) => {
    const chunks: string[] = []
    page.on('response', (r) => {
      const path = new URL(r.url()).pathname
      if (path.endsWith('.js')) chunks.push(path)
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, account('STUDENT'))
    for (const route of ['/student/dashboard', '/student/opportunities', '/student/applications']) {
      await page.goto(QA_BASE + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
    }

    /*
     * The dev server serves unbundled modules, so this asserts on SOURCE PATHS rather than on built
     * chunk names: a student's session must never fetch a module from the admin, university or
     * organization feature directories. That is the same property the production budget test checks
     * against built chunks, expressed where a dev run can see it.
     */
    const foreign = chunks.filter((c) => /\/src\/features\/(admin|university|organization)\//.test(c))
    expect(foreign, 'a student fetched another portal\'s code').toEqual([])
  })
})
