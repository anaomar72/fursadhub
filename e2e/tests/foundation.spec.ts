import { test, expect } from '@playwright/test'

/**
 * Phase 0 foundation smoke test — proves the whole system (browser -> React
 * dev server) serves the FursadHub app shell. Real business journeys
 * (registration, applications, placements, ...) are added phase by phase.
 *
 * <p>The assertions target the approved public shell
 * (design-reference/fursadhub-final/01_home_page_clean.png): the brand lockup in the header, the
 * hero headline, and the public navigation landmark. They replace the pre-redesign checks for a
 * "FursadHub" heading and the standalone tagline line — the tagline now lives inside the supplied
 * logo artwork rather than as separate DOM text, so asserting on it was asserting on the old page.
 */
test('home page renders the FursadHub app shell', async ({ page }) => {
  await page.goto('/')

  // Brand lockup, linking home, in the public header.
  await expect(page.getByRole('link', { name: 'FursadHub' }).first()).toBeVisible()

  /*
   * The approved hero headline, split across styled spans so the accent word can be coloured.
   *
   * <p>This asserted "Connect. Learn. Grow." — the headline from BEFORE the presentation refresh.
   * The page has read "Find Internships. Build Real Futures." since that work landed, so this test
   * had been failing against the shipped home page rather than guarding it. Matching on the two
   * sentences rather than one exact string keeps it meaningful without making it brittle to a
   * copy tweak.
   */
  const hero = page.getByRole('heading', { level: 1 })
  await expect(hero).toBeVisible()
  await expect(hero).toContainText(/Find Internships/i)
  await expect(hero).toContainText(/Real Futures/i)

  // The public navigation landmark, so the shell is not just a bare page body.
  await expect(page.getByRole('navigation', { name: 'Public navigation' }).first()).toBeVisible()
})
