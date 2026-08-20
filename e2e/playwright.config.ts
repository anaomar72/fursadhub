import { defineConfig, devices } from '@playwright/test'

/**
 * Whole-system e2e config (browser -> React -> Spring Boot -> PostgreSQL).
 * Lives at the repo root per docs/architecture/REPOSITORY_STRUCTURE.md.
 *
 * No complete business journeys exist yet (Phase 0) — see
 * docs/CLAUDE_IMPLEMENTATION_PHASES.md PHASE 8 for the required journeys
 * this suite grows into.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev --prefix ../apps/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
