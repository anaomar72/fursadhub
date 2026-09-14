import { test, expect, type Page } from '@playwright/test'
import { account, manifestPath, QA_BASE, settle, signIn, trueContentWidth, type QaAccount } from './support/qa'

/**
 * Personal account pages must keep the reader inside their own portal.
 *
 * <p>The defect: the account area rendered its own shell with a four-item sidebar, so opening
 * Profile REPLACED the primary navigation. A student lost Dashboard, Applications and Placements;
 * on a phone the single hamburger then opened the account list, leaving no route back to the portal
 * except the browser's Back button. Personal settings are secondary; the role portal is primary.
 *
 * <p>Every role that can reach these pages is covered, not just the student the defect was reported
 * against — the shell is resolved from membership data, so each role exercises a different branch.
 */
test.skip(!manifestPath(), 'FH_QA_MANIFEST not set — provision the QA environment first')

const ACCOUNT_ROUTES = ['/account/profile', '/account/notifications', '/account/privacy', '/account/testimonial']

/**
 * The destinations offered by the PRIMARY navigation landmark.
 *
 * <p>Scoped to the sidebar's own landmark so the account strip — which is a `nav` too — cannot
 * satisfy an assertion about the portal rail. That distinction is the whole point of the fix.
 */
async function primaryNavLinks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const navs = [...document.querySelectorAll('nav')]
    // The portal rail is the navigation that offers portal destinations; the account strip offers
    // only /account/* ones. Pick whichever nav has links outside /account.
    for (const nav of navs) {
      const hrefs = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')
      if (hrefs.some((h) => h.startsWith('/') && !h.startsWith('/account'))) return hrefs
    }
    return []
  })
}

/** Roles, and the portal each should keep while inside the account area. */
const ROLES: { label: string; role: string; scope?: string; expect: RegExp }[] = [
  { label: 'student', role: 'STUDENT', expect: /^\/student\// },
  { label: 'university admin', role: 'UNIVERSITY_ADMIN', scope: 'Alpha', expect: /^\/university\// },
  { label: 'department coordinator', role: 'DEPARTMENT_COORDINATOR', expect: /^\/university\// },
  { label: 'university supervisor', role: 'UNIVERSITY_SUPERVISOR', expect: /^\/university\// },
  { label: 'organization admin', role: 'ORGANIZATION_ADMIN', scope: 'Alpha', expect: /^\/organization\// },
  { label: 'recruiter', role: 'RECRUITER', scope: 'Alpha', expect: /^\/organization\// },
  { label: 'organization supervisor', role: 'ORGANIZATION_SUPERVISOR', scope: 'Alpha', expect: /^\/organization\// },
  { label: 'super admin', role: 'SUPER_ADMIN', expect: /^\/admin\// },
  { label: 'verification officer', role: 'VERIFICATION_OFFICER', expect: /^\/admin\// },
]

test.describe('the portal survives the account area', () => {
  for (const subject of ROLES) {
    test(`${subject.label} keeps their portal navigation on every account page`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize({ width: 1440, height: 900 })
      const who: QaAccount = account(subject.role, subject.scope)
      await signIn(page, who)

      const portalLinks = await primaryNavLinks(page)
      expect(portalLinks.length, `${subject.label} has no portal navigation to begin with`).toBeGreaterThan(1)

      for (const route of ACCOUNT_ROUTES) {
        await page.goto(QA_BASE + route, { waitUntil: 'networkidle' })
        await settle(page)

        const onAccountPage = await primaryNavLinks(page)
        // The rail is still the caller's own, and still offers portal destinations.
        const portalDestinations = onAccountPage.filter((h) => subject.expect.test(h))
        expect(
          portalDestinations.length,
          `${subject.label} lost their portal navigation on ${route} (saw ${JSON.stringify(onAccountPage)})`,
        ).toBeGreaterThan(0)
      }

      // And the reader can get back to their dashboard by clicking, not by pressing Back.
      const dashboard = page.locator(`nav a[href^="${subject.expect.source.replace(/[^a-z/]/g, '')}"]`).first()
      await dashboard.click()
      await page.waitForTimeout(1200)
      expect(new URL(page.url()).pathname, `${subject.label} could not return to their portal`).toMatch(subject.expect)
    })
  }
})

test.describe('account subsections', () => {
  test('the account strip is its own navigation, and marks the current page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, account('STUDENT'))
    await page.goto(`${QA_BASE}/account/notifications`, { waitUntil: 'networkidle' })
    await settle(page)

    // Two distinct navigation landmarks, each with its own accessible name, rather than one
    // replacing the other or being nested inside it.
    const named = await page.evaluate(() =>
      [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')).filter(Boolean))
    expect(new Set(named).size, 'navigation landmarks must be distinguishable by name').toBeGreaterThan(1)

    const current = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-current="page"]')].map((el) => el.textContent?.trim()))
    expect(current.length, 'the account strip does not mark its current subsection').toBeGreaterThan(0)
  })

  test('no primary portal item is falsely marked active while on an account page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, account('STUDENT'))
    await page.goto(`${QA_BASE}/account/profile`, { waitUntil: 'networkidle' })
    await settle(page)

    const activePortalItems = await page.evaluate(() =>
      [...document.querySelectorAll('a[aria-current]')]
        .map((a) => a.getAttribute('href') ?? '')
        .filter((h) => h.startsWith('/') && !h.startsWith('/account')))
    expect(activePortalItems, 'a portal destination is marked current while the reader is in the account area').toEqual([])
  })
})

test.describe('mobile', () => {
  test('the hamburger opens the PORTAL navigation, not an account-only drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page, account('STUDENT'))
    await page.goto(`${QA_BASE}/account/notifications`, { waitUntil: 'networkidle' })
    await settle(page)

    /*
     * Scoped to the topbar. Once the drawer opens, its own dialog is rendered BEFORE the header in
     * the DOM, so an unscoped `.first()` match starts resolving to a control inside the drawer and
     * the assertion silently changes subject.
     */
    const trigger = page.locator('header').getByRole('button', { name: /menu|navigation|open/i }).first()
    await expect(trigger, 'no way into the navigation on a phone').toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    await page.waitForTimeout(600)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    /*
     * The drawer must offer the student portal. This is the heart of the reported defect: the one
     * hamburger used to open the account list, so a reader on /account/notifications had no way to
     * reach Dashboard, Applications or Placements at all.
     */
    const drawerLinks = await primaryNavLinks(page)
    expect(
      drawerLinks.filter((h) => h.startsWith('/student')).length,
      `the phone drawer offered no portal destinations (saw ${JSON.stringify(drawerLinks)})`,
    ).toBeGreaterThan(0)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await expect(trigger, 'Escape must close the drawer').toHaveAttribute('aria-expanded', 'false')
  })

  test('account pages fit a phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await signIn(page, account('STUDENT'))
    for (const route of ACCOUNT_ROUTES) {
      await page.goto(QA_BASE + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      expect(await trueContentWidth(page), `${route} is wider than a 320px viewport`).toBeLessThanOrEqual(320)
    }
  })
})

test('signing out still works from an account page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, account('STUDENT'))
  await page.goto(`${QA_BASE}/account/profile`, { waitUntil: 'networkidle' })
  await settle(page)

  await page.getByRole('button', { name: /sign out|log ?out/i }).first().click()
  await page.waitForTimeout(2000)
  expect(new URL(page.url()).pathname, 'sign out did not leave the authenticated area').toMatch(/^\/(login)?$/)
})
