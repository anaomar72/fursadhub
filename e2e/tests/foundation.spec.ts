import { test, expect } from '@playwright/test'

/**
 * Phase 0 foundation smoke test — proves the whole system (browser -> React
 * dev server) serves the FursadHub app shell. Real business journeys
 * (registration, applications, placements, ...) are added phase by phase.
 */
test('home page renders the FursadHub app shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'FursadHub' })).toBeVisible()
  await expect(page.getByText('Opening doors to your future.').first()).toBeVisible()
})
