import { test, expect, type Page } from '@playwright/test'
import { account, manifestPath, QA_BASE, signIn, type QaAccount } from './support/qa'

/**
 * Account-switch isolation and sign-out, in a real browser against the real API.
 *
 * <p>What jsdom cannot prove and this does: the HttpOnly refresh cookie, its `Path=/api/v1/auth`
 * scoping and clearing, a real page reload, two tabs sharing one cookie jar and one localStorage,
 * and the browser Back button.
 *
 * <p>Signing out goes through the account menu a person uses — never `clearCookies()` — because the
 * sign-out path itself is what is under test.
 */
test.skip(!manifestPath(), 'FH_QA_MANIFEST not set — provision the QA environment first')

/** A positive wait for the signed-in identity: generous, because it includes a cold workspace load. */
const IDENTITY_TIMEOUT_MS = 15_000

async function signOutThroughMenu(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: /account/i }).click()
  await page.getByRole('menuitem', { name: /sign out/i }).click()
  await page.waitForURL((url) => url.pathname.startsWith('/login'))
}

/**
 * Every text the page shows from now on, so a one-frame flash of the previous account is caught.
 * Collected on the test side and re-armed on every document load, so it survives the full
 * navigations that sign-in and reload perform. Returns a reader for what has been seen.
 */
async function recordText(page: Page): Promise<() => string> {
  const seen: string[] = []
  await page.exposeFunction('__fhRecordText', (text: string) => {
    seen.push(text)
  })
  const observe = () => {
    const report = () =>
      (window as unknown as { __fhRecordText: (text: string) => void }).__fhRecordText(document.body?.innerText ?? '')
    new MutationObserver(report).observe(document, { subtree: true, childList: true, characterData: true })
    report()
  }
  await page.addInitScript(observe)
  await page.evaluate(observe)
  return () => seen.join('\n')
}

async function expectSignedOut(page: Page) {
  await expect(page).toHaveURL(/\/login/)
  await expect(page.locator('#identifier')).toBeVisible()
}

test.describe('session isolation in a real browser', () => {
  test.setTimeout(120_000)

  const switches: [string, string][] = [
    ['SUPER_ADMIN', 'STUDENT'],
    ['STUDENT', 'SUPER_ADMIN'],
    ['ORGANIZATION_ADMIN', 'RECRUITER'],
    ['ORGANIZATION_ADMIN', 'UNIVERSITY_ADMIN'],
    ['RECRUITER', 'DEPARTMENT_COORDINATOR'],
  ]
  for (const [fromRole, toRole] of switches) {
    test(`${fromRole} → sign out → ${toRole} never shows the previous account`, async ({ page }) => {
      const a: QaAccount = account(fromRole)
      const b: QaAccount = account(toRole)
      await signIn(page, a)
      await expect(page.getByText(a.email).first()).toBeVisible({ timeout: IDENTITY_TIMEOUT_MS })

      await signOutThroughMenu(page)
      const seen = await recordText(page)
      await signIn(page, b)
      await expect(page.getByText(b.email).first()).toBeVisible({ timeout: IDENTITY_TIMEOUT_MS })

      expect(seen()).not.toContain(a.email)
    })
  }

  test('sign-out then reload stays signed out; Back cannot reopen the workspace', async ({ page }) => {
    const a = account('STUDENT')
    await signIn(page, a)
    const workspace = page.url()

    await signOutThroughMenu(page)
    await page.reload()
    await expectSignedOut(page)

    await page.goBack()
    await page.goto(workspace)
    await expectSignedOut(page)
    await expect(page.getByText(a.email)).toHaveCount(0)
  })

  test('a sign-out whose logout request FAILS is not undone by a reload', async ({ page }) => {
    const a = account('SUPER_ADMIN')
    const b = account('STUDENT')
    await signIn(page, a)

    // The logout request never reaches the server: the refresh cookie survives as a live session.
    await page.route('**/api/v1/auth/logout', (route) => route.abort('internetdisconnected'))
    await signOutThroughMenu(page)

    let refreshes = 0
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/auth/refresh')) refreshes += 1
    })
    await page.reload()
    await expectSignedOut(page)
    await page.goto(`${QA_BASE}/admin`)
    await expectSignedOut(page)
    expect(refreshes, 'the app must not silently refresh from the surviving cookie').toBe(0)

    // The network is back: the next start retries the logout, and another account signs in normally.
    await page.unroute('**/api/v1/auth/logout')
    await page.reload()
    await signIn(page, b)
    await expect(page.getByText(b.email).first()).toBeVisible({ timeout: IDENTITY_TIMEOUT_MS })
    await page.reload()
    await expect(page.getByText(b.email).first()).toBeVisible({ timeout: IDENTITY_TIMEOUT_MS })
    await expect(page.getByText(a.email)).toHaveCount(0)
  })

  test('sign-out in one tab signs out the other tab of the same browser', async ({ context }) => {
    const a = account('ORGANIZATION_ADMIN')
    const tabOne = await context.newPage()
    await signIn(tabOne, a)
    const workspace = tabOne.url()

    const tabTwo = await context.newPage()
    await tabTwo.goto(workspace)
    await expect(tabTwo.getByText(a.email).first()).toBeVisible({ timeout: IDENTITY_TIMEOUT_MS })

    await signOutThroughMenu(tabOne)

    // No reload, no navigation in tab two: it leaves the workspace on its own.
    await expectSignedOut(tabTwo)
    await expect(tabTwo.getByText(a.email)).toHaveCount(0)
    // And it does not come back on reload either.
    await tabTwo.reload()
    await expectSignedOut(tabTwo)
  })

  test('a sign-in in another tab replaces this tab’s account without showing the old one', async ({ context }) => {
    const a = account('ORGANIZATION_ADMIN')
    const b = account('STUDENT')
    const tabOne = await context.newPage()
    await signIn(tabOne, a)
    await expect(tabOne.getByText(a.email).first()).toBeVisible({ timeout: IDENTITY_TIMEOUT_MS })
    const seen = await recordText(tabOne)

    const tabTwo = await context.newPage()
    await signIn(tabTwo, b)

    await expect(tabOne.getByText(b.email).first()).toBeVisible({ timeout: IDENTITY_TIMEOUT_MS })
    await expect(tabOne.getByText(a.email)).toHaveCount(0)
    const shownAfterSwitch = seen().split(b.email).slice(1).join(b.email)
    expect(shownAfterSwitch).not.toContain(a.email)
  })
})
