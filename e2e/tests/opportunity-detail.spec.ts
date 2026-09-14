import { test, expect, type Page } from '@playwright/test'

/**
 * Regression cover for the opportunity detail page, from a round of manual mobile testing.
 *
 * <p>Geometry and behaviour rather than screenshots: each assertion names the specific defect it
 * guards, so a failure says what broke instead of "something moved".
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1440]

/** The first published opportunity, so the suite does not depend on a hardcoded id. */
async function firstOpportunity(page: Page): Promise<string | null> {
  const res = await page.request.get(`${(process.env.FH_API_URL ?? 'http://localhost:8080/api/v1')}/public/opportunities?page=0&size=1`)
  if (!res.ok()) return null
  const body = await res.json()
  return body.content?.[0]?.id ?? null
}

/**
 * True page width, measured with horizontal clipping disabled.
 *
 * <p>The public shell sets `overflow-x: clip`. That silently HIDES horizontal overflow rather than
 * preventing it, so `documentElement.scrollWidth` reads as clean while content is being cut off —
 * which is exactly how a 529px-wide layout survived in a 360px viewport through several rounds of
 * automated width checks. Un-clipping first is what makes this assertion mean anything.
 */
async function trueContentWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const restore: [HTMLElement, string][] = []
    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'clip' || ox === 'hidden') {
        restore.push([el, el.style.overflowX])
        el.style.overflowX = 'visible'
      }
    }
    const width = document.body.scrollWidth
    for (const [el, prev] of restore) el.style.overflowX = prev
    return width
  })
}

test.describe('opportunity detail responsiveness', () => {
  for (const width of WIDTHS) {
    test(`fits its viewport at ${width}px`, async ({ page }) => {
      test.setTimeout(90_000)
      await page.setViewportSize({ width, height: 900 })
      const id = await firstOpportunity(page)
      test.skip(!id, 'no published opportunity available')

      await page.goto(`${BASE}/opportunities/${id}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(900)

      // The layout must genuinely fit, not merely be clipped to look as though it does.
      expect(await trueContentWidth(page), `content is wider than the ${width}px viewport`).toBeLessThanOrEqual(width)

      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible()

      const title = await heading.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return { right: rect.right, left: rect.left, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
      })
      // The title wraps rather than running past the edge — the defect was a one-line title in a
      // ~40px column, cut off by the shell's clip.
      expect(title.right, 'the title extends past the viewport').toBeLessThanOrEqual(width + 1)
      expect(title.scrollWidth - title.clientWidth, 'the title is clipped inside its own box').toBeLessThanOrEqual(1)

      // Media stays inside its container, whatever its natural shape.
      const media = await page.evaluate((vw) =>
        [...document.querySelectorAll('img')]
          .map((i) => ({ src: (i.currentSrc || i.src).split('/').pop(), right: i.getBoundingClientRect().right, w: i.getBoundingClientRect().width }))
          .filter((m) => m.w > 0 && m.right > vw + 1), width)
      expect(media, 'an image overflows the viewport').toEqual([])
    })
  }

  test('every section remains reachable from the section navigation on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 })
    const id = await firstOpportunity(page)
    test.skip(!id, 'no published opportunity available')
    await page.goto(`${BASE}/opportunities/${id}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)

    const nav = page.locator('nav').filter({ has: page.locator('a[href^="#"]') }).first()
    await expect(nav).toBeVisible()

    const geometry = await nav.evaluate((el) => ({
      overflowX: getComputedStyle(el).overflowX,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      links: [...el.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    }))

    /*
     * The strip is allowed to be wider than its box — that is what makes it a scroller. What is NOT
     * allowed is hiding the overflow, which is how sections became unreachable: the requirement is
     * that every one can still be got to.
     */
    expect(geometry.overflowX, 'the section strip must scroll, not hide its overflow').toBe('auto')
    expect(geometry.links.length).toBeGreaterThan(1)

    // Each target must actually exist on the page, and each link must be reachable by scrolling.
    for (const href of geometry.links) {
      const target = page.locator(`${href}`)
      await expect(target, `${href} has no section to jump to`).toHaveCount(1)
    }

    const lastLink = nav.locator('a').last()
    await lastLink.scrollIntoViewIfNeeded()
    await expect(lastLink, 'the last section link cannot be scrolled to').toBeInViewport()
  })
})

test.describe('route scroll behaviour', () => {
  test('opening a detail page from a scrolled listing starts at the top, and Back restores', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/opportunities`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)

    // Scroll the listing down, the way a reader browsing past the first few results would.
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForTimeout(400)
    const listingOffset = await page.evaluate(() => window.scrollY)
    test.skip(listingOffset < 100, 'listing is too short to scroll on this dataset')

    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    await firstCard.click()
    await page.waitForURL(/\/opportunities\/[^/]+$/, { timeout: 15_000 })
    await page.waitForTimeout(900)

    // A link followed forward is a new page, and a new page begins at its beginning.
    expect(await page.evaluate(() => window.scrollY), 'the detail page opened part-way down').toBeLessThan(40)

    await page.goBack()
    await page.waitForTimeout(1200)

    /*
     * And Back is the one case where the previous offset IS correct. A blanket scroll-to-top on
     * every navigation would have broken this, which is why the fix uses the router's own
     * ScrollRestoration rather than an effect on the pathname.
     */
    const restored = await page.evaluate(() => window.scrollY)
    expect(Math.abs(restored - listingOffset), 'Back did not return the reader to where they were').toBeLessThan(120)
  })
})
