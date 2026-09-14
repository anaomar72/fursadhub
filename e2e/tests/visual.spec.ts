import { test, expect, type Page } from '@playwright/test'
const OUT = 'C:/Users/hp/AppData/Local/Temp/claude/C--Users-hp-documents-fursadhub/1153747d-a6c3-4723-b7a7-b1b39f1102e1/scratchpad/shots'
// The dev server, not the preview build: the API allows 5173 as an origin, so a CORS rejection
// cannot masquerade as a page error in the console assertion below.
const BASE = 'http://localhost:5173'

async function settle(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150))
    }
    window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400))
  })
  await page.waitForTimeout(600)
}

const ROUTES: [string, string][] = [
  ['home', '/'], ['about', '/about'], ['internships', '/internships'],
  ['organizations', '/organizations'], ['universities', '/universities'],
  ['login', '/login'], ['register', '/register'],
]

for (const [name, route] of ROUTES) {
  for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']] as [number, number, string][]) {
    test(`${tag}-${name}`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', m => { if (m.type() === 'error' && !/401|Failed to load resource/.test(m.text())) errors.push(m.text()) })
      page.on('pageerror', e => errors.push('PAGEERROR ' + e.message))
      await page.setViewportSize({ width: w, height: h })
      await page.goto(BASE + route, { waitUntil: 'networkidle' })
      await settle(page)
      await page.screenshot({ path: `${OUT}/prod-${tag}-${name}.png`, fullPage: true })
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth)
      // Every image that made it into the DOM must have actually decoded.
      const broken = await page.evaluate(() => [...document.querySelectorAll('img')]
        .filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src))
      console.log(`VIS ${tag}-${name} overflow=${overflow} broken=${JSON.stringify(broken)} errors=${JSON.stringify(errors.slice(0,2))}`)
      expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0)
      expect(broken, 'no broken images').toEqual([])
      expect(errors, 'no console/page errors').toEqual([])
    })
  }
}
