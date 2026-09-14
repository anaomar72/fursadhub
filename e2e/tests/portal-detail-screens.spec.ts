import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { account, manifestPath, QA_BASE, settle, signIn } from './support/qa'

/**
 * The parameterised screens — the ones you can only reach once real records exist.
 *
 * <p>The static routes are covered by the sweeps beside this. These are the detail pages and
 * workspaces where the actual work happens: one candidacy, one placement and its lifecycle tabs,
 * one internship, one verification case, one account. They need a provisioned workflow, which is
 * why they are addressed by id from the fixture manifest rather than crawled.
 *
 * <p>What is asserted is the floor every surface owes: it renders its own heading rather than a
 * spinner or a blank, it does not scroll sideways on a phone, it has no broken image, and it logs
 * no error. Business behaviour is the unit and API suites' job.
 */
const WORKFLOW = process.env.FH_QA_WORKFLOW
const OUT = 'C:/Users/hp/AppData/Local/Temp/claude/C--Users-hp-documents-fursadhub/1153747d-a6c3-4723-b7a7-b1b39f1102e1/scratchpad/qa/detail'

test.skip(!manifestPath() || !WORKFLOW, 'needs FH_QA_MANIFEST and FH_QA_WORKFLOW from a provisioned run')

const ids = WORKFLOW ? (JSON.parse(readFileSync(WORKFLOW, 'utf8')) as Record<string, string | string[] | null>) : {}
const id = (key: string) => {
  const v = ids[key]
  return Array.isArray(v) ? v[0] : v
}

interface Surface { label: string; route: string }

async function check(page: Page, surface: Surface, viewport: 'desktop' | 'mobile') {
  const errors: string[] = []
  const onConsole = (m: { type: () => string; text: () => string }) => {
    if (m.type() === 'error' && !/Failed to load resource|401|403|404/.test(m.text())) errors.push(m.text())
  }
  const onPageError = (e: Error) => errors.push(`PAGEERROR ${e.message}`)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  await page.goto(QA_BASE + surface.route, { waitUntil: 'networkidle' })
  await settle(page)
  await page.screenshot({ path: `${OUT}/${viewport}/${surface.label}.png`, fullPage: true }).catch(() => {})

  const state = await page.evaluate(() => ({
    heading: document.querySelector('h1')?.textContent?.trim() ?? null,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    broken: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
    spinnerOnly: !document.querySelector('h1') && !!document.querySelector('[role="status"]'),
  }))
  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  console.log(`DETAIL ${viewport.padEnd(7)} ${surface.label.padEnd(28)} h1=${JSON.stringify(state.heading)} overflow=${state.overflow} broken=${state.broken} errors=${errors.length}`)
  expect(state.heading, `${surface.label} rendered no heading`).not.toBeNull()
  expect(state.spinnerOnly, `${surface.label} never resolved past its spinner`).toBe(false)
  expect(state.overflow, `${surface.label} scrolls sideways`).toBeLessThanOrEqual(0)
  expect(state.broken, `${surface.label} has a broken image`).toBe(0)
  expect(errors, `${surface.label} logged errors`).toEqual([])
}

const CASES: { area: string; role: string; scope?: string; surfaces: () => Surface[] }[] = [
  {
    area: 'student', role: 'STUDENT',
    surfaces: () => [
      { label: 'opportunity-detail', route: `/student/opportunities/${id('opportunityId')}` },
      { label: 'candidacy-detail', route: `/student/applications/${id('candidacy1')}` },
      { label: 'placement-workspace', route: `/student/placements/${id('placementId')}` },
      { label: 'placement-weekly-logs', route: `/student/placements/${id('placementId')}/weekly-logs` },
      { label: 'placement-attendance', route: `/student/placements/${id('placementId')}/attendance` },
      { label: 'placement-final-report', route: `/student/placements/${id('placementId')}/final-report` },
      { label: 'placement-defense', route: `/student/placements/${id('placementId')}/defense` },
    ],
  },
  {
    area: 'organization', role: 'ORGANIZATION_ADMIN', scope: 'Alpha',
    surfaces: () => [
      { label: 'internship-detail', route: `/organization/opportunities/${id('opportunityId')}` },
      { label: 'candidate-pool', route: `/organization/opportunities/${id('opportunityId')}/candidates` },
      { label: 'candidate-detail', route: `/organization/candidacies/${id('candidacy1')}` },
      { label: 'placement-detail', route: `/organization/placements/${id('placementId')}` },
      { label: 'placement-evaluation', route: `/organization/placements/${id('placementId')}/evaluation` },
    ],
  },
  {
    area: 'university', role: 'UNIVERSITY_ADMIN', scope: 'Alpha',
    surfaces: () => [
      { label: 'verification-case', route: `/university/verification-cases/${id('verificationCases')}` },
      { label: 'placement-detail', route: `/university/placements/${id('placementId')}` },
      { label: 'placement-weekly-logs', route: `/university/placements/${id('placementId')}/weekly-logs` },
      { label: 'placement-evaluation', route: `/university/placements/${id('placementId')}/evaluation` },
    ],
  },
]

for (const testCase of CASES) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`${testCase.area} detail screens, ${viewport}`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 })
      await signIn(page, account(testCase.role, testCase.scope))
      for (const surface of testCase.surfaces()) await check(page, surface, viewport)
    })
  }
}
