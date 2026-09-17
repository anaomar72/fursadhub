import { test, expect, type Page } from '@playwright/test'

/**
 * Front-end delivery budget.
 *
 * <p>Measured against the PRODUCTION build (`vite preview` on 4173, started separately), because a
 * dev server's unbundled module graph says nothing about what a visitor downloads. Throttled to a
 * regular-4G profile with a 4x CPU slowdown: FursadHub's pilot market is Somalia, and a budget
 * asserted on an unthrottled localhost is not a budget.
 *
 * <p>The thresholds are ceilings with headroom, not targets — they exist to catch a regression of
 * the kind this suite was written after (5.7MB of PNG on the landing page, and a single 1.4MB
 * bundle that shipped the platform admin console to every anonymous visitor).
 *
 * <p>Skipped automatically when nothing is serving the production build on 4173.
 */
const BASE = process.env.E2E_PREVIEW_URL ?? 'http://localhost:4173'

type Weights = { js: number; img: number; other: number; total: number; chunks: string[] }

async function loadAndWeigh(page: Page, path: string): Promise<Weights> {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (3 * 1024 * 1024) / 8,
    latency: 40,
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  const seen = new Map<string, number>()
  page.on('response', async (r) => {
    const url = new URL(r.url()).pathname
    if (seen.has(url)) return
    try {
      seen.set(url, (await r.body()).byteLength)
    } catch {
      /* redirect or bodiless response */
    }
  })

  await page.goto(BASE + path, { waitUntil: 'load' })
  await page.waitForTimeout(3500)

  let js = 0
  let img = 0
  let other = 0
  for (const [url, bytes] of seen) {
    if (url.endsWith('.js')) js += bytes
    else if (/\.(webp|png|jpe?g|svg|avif)$/.test(url)) img += bytes
    else other += bytes
  }
  const kb = (n: number) => Math.round(n / 1024)
  return { js: kb(js), img: kb(img), other: kb(other), total: kb(js + img + other), chunks: [...seen.keys()] }
}

test.beforeAll(async ({ request }) => {
  const reachable = await request.get(BASE).then((r) => r.ok()).catch(() => false)
  test.skip(!reachable, `no production build served at ${BASE} — run "npx vite preview --port 4173"`)
})

test('the public home page stays within its delivery budget', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const w = await loadAndWeigh(page, '/')
  console.log(`PERF home js=${w.js}KB img=${w.img}KB other=${w.other}KB total=${w.total}KB`)

  // Imagery was 5.7MB of PNG across the landing page, hero included. It is now WebP, right-sized.
  expect(w.img, 'home page imagery').toBeLessThan(300)
  expect(w.total, 'home page total transfer').toBeLessThan(1600)
})

test('an anonymous visitor never downloads a portal they cannot open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { chunks } = await loadAndWeigh(page, '/')

  /*
   * The point of the route split. Each portal is one chunk behind a single dynamic import in
   * `src/app/router/areas/*`, so nothing from the student, university, organization, internship or
   * admin areas may appear on a page reachable without signing in. The admin console alone is the
   * largest area in the product.
   *
   * <p>This asserts on the SHIPPED chunk list rather than on a byte count, because the two ways
   * this regressed while it was being built were both invisible to a size check: a stray eager
   * import pulling an area into the entry graph, and a bundler-level grouping that made Vite emit a
   * modulepreload hint for every chunk.
   */
  const portalChunks = chunks.filter((c) =>
    /\/assets\/(student|university|organization|internship|admin|account|auth)-[\w-]+\.js$/.test(c),
  )
  expect(portalChunks, 'no portal chunk on the public home page').toEqual([])
})
