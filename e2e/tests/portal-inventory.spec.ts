import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { account, inspect, manifestPath, signIn, type SurfaceReport } from './support/qa'

/**
 * Walks every authenticated surface as the role that owns it, at desktop and phone width, and
 * writes what it found to a report the redesign work is then driven from.
 *
 * <p>This asserts almost nothing on purpose — it is the inventory pass. Defects it surfaces get
 * their own assertions in the suites beside it, so that a failure names the specific defect rather
 * than "something on one of seventy pages".
 */
const OUT = process.env.FH_QA_REPORT ?? 'C:/Users/hp/AppData/Local/Temp/claude/C--Users-hp-documents-fursadhub/1153747d-a6c3-4723-b7a7-b1b39f1102e1/scratchpad/qa/inventory'

test.skip(!manifestPath(), 'FH_QA_MANIFEST not set — provision the QA environment first')

/*
 * Opt-in, via FH_QA_INVENTORY=1.
 *
 * <p>This suite asserts nothing — it captures a full-page screenshot of every authenticated surface
 * at two widths and writes a report. That makes it the slowest thing in the repository by a wide
 * margin and, run alongside the suites that DO assert, slow enough to exhaust its own budget. It is
 * the tool the audit is driven with, not a gate; the properties it surfaces are pinned by
 * portal-responsive-a11y and rbac-matrix, which are fast and always run.
 */
test.skip(!process.env.FH_QA_INVENTORY, 'diagnostic sweep — set FH_QA_INVENTORY=1 to capture it')
test.describe.configure({ mode: 'serial' })

/** The static routes of each area. Parameterised detail routes are covered by the workflow suites. */
const AREAS: Record<string, { role: string; scope?: string; routes: string[] }> = {
  student: {
    role: 'STUDENT',
    routes: [
      '/student/dashboard', '/student/enrollment', '/student/profile', '/student/opportunities',
      '/student/saved', '/student/applications', '/student/nominations', '/student/placements',
    ],
  },
  university: {
    role: 'UNIVERSITY_ADMIN',
    scope: 'Alpha',
    routes: [
      '/university/dashboard', '/university/students', '/university/verification-cases',
      '/university/departments', '/university/staff', '/university/partners', '/university/profile',
      '/university/my-students', '/university/supervision', '/university/opportunity-requests',
      '/university/nominations', '/university/placements', '/university/internship-policy',
    ],
  },
  organization: {
    role: 'ORGANIZATION_ADMIN',
    scope: 'Alpha',
    routes: [
      '/organization/dashboard', '/organization/opportunities', '/organization/opportunities/new',
      '/organization/candidates', '/organization/partners', '/organization/staff',
      '/organization/supervision', '/organization/placements', '/organization/profile',
    ],
  },
  admin: {
    role: 'SUPER_ADMIN',
    routes: [
      '/admin/dashboard', '/admin/users', '/admin/organizations', '/admin/universities',
      '/admin/verification-escalations', '/admin/opportunities', '/admin/privacy-requests',
      '/admin/legal-documents', '/admin/testimonials', '/admin/audit', '/admin/platform-roles',
    ],
  },
  account: {
    role: 'STUDENT',
    routes: ['/account/profile', '/account/notifications', '/account/privacy', '/account/testimonial'],
  },
}

const VIEWPORTS: [string, number, number][] = [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
]

for (const [areaName, area] of Object.entries(AREAS)) {
  for (const [vpName, width, height] of VIEWPORTS) {
    test(`inventory ${areaName} ${vpName}`, async ({ page }) => {
      test.setTimeout(300_000)
      const who = account(area.role, area.scope)
      const findings: (SurfaceReport & { viewport: string })[] = []
      await page.setViewportSize({ width, height })
      await signIn(page, who)
      for (const route of area.routes) {
        const report = await inspect(page, route)
        findings.push({ ...report, viewport: vpName })
        mkdirSync(`${OUT}/${vpName}`, { recursive: true })
        await page.screenshot({
          path: `${OUT}/${vpName}/${route.replace(/^\//, '').replace(/\//g, '-')}.png`,
          fullPage: true,
        })
        const flags = [
          report.overflow > 0 ? `OVERFLOW:${report.overflow}` : '',
          report.brokenImages.length ? `BROKEN_IMG:${report.brokenImages.length}` : '',
          report.consoleErrors.length ? `ERRORS:${report.consoleErrors.length}` : '',
          report.landed !== route ? `REDIRECTED->${report.landed}` : '',
        ].filter(Boolean).join(' ')
        console.log(`INV ${vpName.padEnd(7)} ${route.padEnd(44)} h1=${JSON.stringify(report.heading)} ${flags}`)
      }

      mkdirSync(OUT, { recursive: true })
      writeFileSync(`${OUT}/${areaName}-${vpName}.json`, JSON.stringify(findings, null, 2))
    })
  }
}
