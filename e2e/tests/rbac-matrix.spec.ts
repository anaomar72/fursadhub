import { test, expect } from '@playwright/test'
import { account, entity, manifestPath, qaManifest, QA_BASE, signIn, type QaAccount } from './support/qa'

/**
 * The role-access and tenant-isolation matrix, verified against the running system.
 *
 * <p>Two things are checked for every case, because only one of them is security. The BROWSER check
 * says what a person sees when they type the URL; the API check says what the server does when
 * asked directly. Frontend route guards are UX — CLAUDE.md section 24 is explicit that hidden
 * navigation is not authorization — so a route that merely redirects in the SPA while its endpoint
 * answers 200 is a finding, not a pass.
 *
 * <p>Nothing here is destructive. Every request is an ordinary read that the application itself
 * issues; the suite only changes WHO is asking.
 */
const API = process.env.FH_QA_API_URL ?? 'http://localhost:8081/api/v1'

test.skip(!manifestPath(), 'FH_QA_MANIFEST not set — provision the QA environment first')

async function accessToken(who: QaAccount): Promise<string> {
  const body = who.loginKind === 'username'
    ? { username: who.loginId, password: who.password }
    : { email: who.loginId, password: who.password }
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`could not authenticate ${who.role} ${who.loginId}: ${res.status}`)
  return (await res.json()).accessToken
}

async function apiStatus(token: string, path: string): Promise<number> {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } })
  return res.status
}

/** Statuses that mean "the server refused". A scoped 404 is a deliberate refusal here, per 26A. */
const REFUSED = [401, 403, 404]

test.describe('platform-role boundaries', () => {
  test('a student cannot reach the admin console, in the browser or at the API', async ({ page }) => {
    const student = account('STUDENT')
    const token = await accessToken(student)

    for (const path of ['/admin/users', '/admin/organizations', '/admin/universities', '/admin/audit']) {
      expect(REFUSED, `API ${path} for a student`).toContain(await apiStatus(token, path))
    }

    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, student)
    for (const route of ['/admin/dashboard', '/admin/users', '/admin/audit', '/admin/platform-roles']) {
      await page.goto(QA_BASE + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)

      /*
       * Asserted on WHAT IS RENDERED, not on the URL changing.
       *
       * <p>The product answers a denial in place rather than bouncing the address, which is a
       * reasonable choice — a redirect hides which link was broken. So "the path is still /admin/…"
       * proves nothing either way, and an earlier version of this test failed on exactly that
       * misreading. What matters is that no administration data or navigation reaches the page.
       */
      const rendered = await page.evaluate(() => ({
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
        navLinks: [...document.querySelectorAll('a[href^="/admin"]')].map((a) => a.getAttribute('href')),
      }))
      expect(rendered.heading, `denial heading on ${route}`).toMatch(/do not have access/i)
      expect(rendered.navLinks, `no admin navigation offered on ${route}`).toEqual([])
    }
  })

  /**
   * The denial surface itself, pinned.
   *
   * <p>It used to render inside the platform console's own chrome: a student who followed a link to
   * /admin/users was shown the navy admin rail and the word "Admin" as the area label, the page
   * title and their own role, while being told they had no administration access. It also had no
   * `h1`, so a screen reader landed on a page with nothing to orient from.
   */
  test('the denial names itself, offers a way out, and does not dress the reader as an admin', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, account('STUDENT'))
    await page.goto(`${QA_BASE}/admin/users`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    expect(await page.locator('text=/^Admin$/').count(), 'the chrome must not label a student "Admin"').toBe(0)
  })

  test('a tenant admin cannot reach platform administration', async () => {
    for (const role of ['UNIVERSITY_ADMIN', 'ORGANIZATION_ADMIN'] as const) {
      const token = await accessToken(account(role, 'Alpha'))
      for (const path of ['/admin/users', '/admin/audit', '/admin/verification-officers']) {
        expect(REFUSED, `API ${path} for ${role}`).toContain(await apiStatus(token, path))
      }
    }
  })
})

test.describe('cross-tenant isolation', () => {
  test('university A cannot read university B records', async () => {
    const a = await accessToken(account('UNIVERSITY_ADMIN', 'Alpha'))
    const b = entity('University', 'Beta')
    for (const path of [
      `/universities/${b.id}/staff`,
      `/universities/${b.id}/students`,
      `/universities/${b.id}/verification-cases`,
      `/universities/${b.id}/placements`,
    ]) {
      expect(REFUSED, `University Alpha reading ${path}`).toContain(await apiStatus(a, path))
    }
  })

  /**
   * The deliberate exception, asserted so it stays deliberate.
   *
   * <p>A university's department list is catalogue data, not tenant data: the student enrolment
   * form lets anyone pick any university and then loads ITS departments, so the endpoint has to
   * answer across tenants. It returns id, universityId, name and code — no people, no records.
   *
   * <p>Written down here because "any authenticated caller can read it" looks like a hole until you
   * know why, and because the test that failed against it first was the one that was wrong.
   */
  test('department lists are cross-tenant catalogue data, and carry nothing but the catalogue', async () => {
    const a = await accessToken(account('UNIVERSITY_ADMIN', 'Alpha'))
    const b = entity('University', 'Beta')
    const res = await fetch(`${API}/universities/${b.id}/departments`, { headers: { Authorization: `Bearer ${a}` } })
    expect(res.status, 'the enrolment form depends on this being readable').toBe(200)

    const rows = await res.json()
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['code', 'id', 'name', 'universityId'])
    }
  })

  test('organization A cannot read organization B records', async () => {
    const a = await accessToken(account('ORGANIZATION_ADMIN', 'Alpha'))
    const b = entity('Organization', 'Beta')
    for (const path of [
      `/organizations/${b.id}/members`,
      `/organizations/${b.id}/opportunities`,
      `/organizations/${b.id}/placements`,
    ]) {
      expect(REFUSED, `Organization Alpha reading ${path}`).toContain(await apiStatus(a, path))
    }
  })

  test('a recruiter cannot read another organization candidates or members', async () => {
    const recruiterA = await accessToken(account('RECRUITER', 'Alpha'))
    const b = entity('Organization', 'Beta')
    for (const path of [`/organizations/${b.id}/members`, `/organizations/${b.id}/opportunities`]) {
      expect(REFUSED, `Recruiter A reading ${path}`).toContain(await apiStatus(recruiterA, path))
    }
  })

  test('a department coordinator cannot reach another university', async () => {
    const coordinatorA = await accessToken(account('DEPARTMENT_COORDINATOR', 'Information Technology'))
    const b = entity('University', 'Beta')
    // Departments are excluded on purpose — see the catalogue test above.
    for (const path of [`/universities/${b.id}/staff`, `/universities/${b.id}/students`, `/universities/${b.id}/verification-cases`]) {
      expect(REFUSED, `Coordinator A reading ${path}`).toContain(await apiStatus(coordinatorA, path))
    }
  })
})

test.describe('no permission inheritance from the admin who created the account', () => {
  test('managed university staff cannot use university-admin-only operations', async () => {
    const own = entity('University', 'Alpha')
    for (const role of ['DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR'] as const) {
      const token = await accessToken(account(role))
      // Staff provisioning is the parent admin's, and creating staff is the sharpest example:
      // a staff member who could call this could mint themselves a second, higher-privileged one.
      const status = await fetch(`${API}/universities/${own.id}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'qa.escalation.attempt@fursadhub.test', password: 'ShouldNeverBeCreated1!',
          confirmPassword: 'ShouldNeverBeCreated1!', displayName: 'nope',
          username: 'qaescalationattempt', role: 'UNIVERSITY_ADMIN', departmentIds: [],
        }),
      }).then((r) => r.status)
      expect(REFUSED, `${role} creating staff`).toContain(status)
    }
  })

  test('managed organization staff cannot use organization-admin-only operations', async () => {
    const own = entity('Organization', 'Alpha')
    for (const role of ['RECRUITER', 'ORGANIZATION_SUPERVISOR'] as const) {
      const token = await accessToken(account(role, 'Alpha'))
      const status = await fetch(`${API}/organizations/${own.id}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'qa.escalation.attempt2@fursadhub.test', password: 'ShouldNeverBeCreated1!',
          confirmPassword: 'ShouldNeverBeCreated1!', displayName: 'nope',
          username: 'qaescalationattempt2', role: 'ORGANIZATION_ADMIN',
        }),
      }).then((r) => r.status)
      expect(REFUSED, `${role} creating a member`).toContain(status)
    }
  })
})

test.describe('privilege escalation through staff creation', () => {
  test('a university admin cannot mint SUPER_ADMIN, a peer admin, or a cross-domain role', async () => {
    const admin = await accessToken(account('UNIVERSITY_ADMIN', 'Alpha'))
    const own = entity('University', 'Alpha')
    for (const role of ['SUPER_ADMIN', 'VERIFICATION_OFFICER', 'UNIVERSITY_ADMIN', 'RECRUITER', 'ORGANIZATION_ADMIN']) {
      const res = await fetch(`${API}/universities/${own.id}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `qa.mint.${role.toLowerCase()}@fursadhub.test`, password: 'ShouldNeverBeCreated1!',
          confirmPassword: 'ShouldNeverBeCreated1!', displayName: 'nope',
          username: `qamint${role.toLowerCase().replace(/_/g, '')}`, role, departmentIds: [],
        }),
      })
      expect(res.ok, `University admin minting ${role} must be refused`).toBe(false)
    }
  })

  test('an organization admin cannot mint SUPER_ADMIN, a peer admin, or a university role', async () => {
    const admin = await accessToken(account('ORGANIZATION_ADMIN', 'Alpha'))
    const own = entity('Organization', 'Alpha')
    for (const role of ['SUPER_ADMIN', 'VERIFICATION_OFFICER', 'ORGANIZATION_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR']) {
      const res = await fetch(`${API}/organizations/${own.id}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `qa.mintorg.${role.toLowerCase()}@fursadhub.test`, password: 'ShouldNeverBeCreated1!',
          confirmPassword: 'ShouldNeverBeCreated1!', displayName: 'nope',
          username: `qamintorg${role.toLowerCase().replace(/_/g, '')}`, role,
        }),
      })
      expect(res.ok, `Organization admin minting ${role} must be refused`).toBe(false)
    }
  })
})

test.describe('authentication lifecycle', () => {
  test('an unauthenticated request is refused on every protected area', async () => {
    for (const path of ['/me', '/admin/users', '/students/me/profile', '/me/notifications']) {
      const res = await fetch(API + path)
      expect(REFUSED, `anonymous ${path}`).toContain(res.status)
    }
  })

  test('every provisioned role can authenticate and lands somewhere it is allowed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const who of qaManifest().accounts) {
      await page.context().clearCookies()
      await signIn(page, who)
      const landed = new URL(page.url()).pathname
      expect(landed, `${who.role} landed back on the login form`).not.toBe('/login')
      console.log(`RBAC ${who.role.padEnd(24)} -> ${landed}`)
    }
  })
})
