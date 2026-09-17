import { test, expect } from '@playwright/test'
import { account, entity, manifestPath, QA_BASE, settle, signIn, type QaAccount } from './support/qa'

/**
 * Managed staff provisioning, driven through the real screens (CLAUDE.md section 26A).
 *
 * <p>The API side of this is covered in `rbac-matrix.spec.ts`. What this adds is the half a person
 * actually touches: a tenant admin fills in the Staff form, the account is created ALREADY ACTIVE
 * with no verification email to chase, the new member signs in through the ordinary login form, and
 * the portal they land in is their own rather than their creator's.
 *
 * <p>Each run creates its own uniquely-named staff member, so the suite is repeatable without
 * depending on — or disturbing — the fixtures the other suites read.
 */
const API = process.env.FH_QA_API_URL ?? 'http://localhost:8081/api/v1'

test.skip(!manifestPath(), 'FH_QA_MANIFEST not set — provision the QA environment first')
test.describe.configure({ mode: 'serial' })

/** A fresh identity per run. The password never leaves this process. */
function newStaff(prefix: string) {
  const stamp = Date.now().toString(36).slice(-6)
  return {
    username: `qa${prefix}${stamp}`.toLowerCase(),
    email: `qa.${prefix}.${stamp}@fursadhub.test`,
    displayName: `QA ${prefix} ${stamp}`,
    password: `Qa${stamp}Staff7!`,
  }
}

async function canAuthenticate(loginId: string, password: string): Promise<boolean> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: loginId, password }),
  })
  return res.ok
}

test('a university admin provisions a coordinator, who then signs in to their own portal', async ({ page }) => {
  test.setTimeout(180_000)
  const admin = account('UNIVERSITY_ADMIN', 'Alpha')
  const staff = newStaff('coord')

  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, admin)
  await page.goto(`${QA_BASE}/university/staff`, { waitUntil: 'networkidle' })
  await settle(page)

  // Open whatever the page calls its create affordance, then fill the form by field semantics
  // rather than by DOM position, so a layout change does not silently stop exercising this.
  await page.getByRole('button', { name: /add|create|new/i }).first().click()
  await page.waitForTimeout(500)

  await page.locator('input[type="email"]').first().fill(staff.email)
  const passwords = page.locator('input[type="password"]')
  await passwords.nth(0).fill(staff.password)
  // Confirm Password: the server rejects a mismatch, so both fields must really be filled.
  if (await passwords.count() > 1) await passwords.nth(1).fill(staff.password)

  for (const [label, value] of [[/username/i, staff.username], [/name/i, staff.displayName]] as [RegExp, string][]) {
    const field = page.getByLabel(label).first()
    if (await field.count()) await field.fill(value).catch(() => {})
  }

  // Role and any required scope.
  const roleSelect = page.locator('select').first()
  if (await roleSelect.count()) await roleSelect.selectOption({ label: /coordinator/i.source ? 'Department coordinator' : '' }).catch(async () => {
    await roleSelect.selectOption('DEPARTMENT_COORDINATOR').catch(() => {})
  })
  const deptCheckbox = page.locator('input[type="checkbox"]').first()
  if (await deptCheckbox.count()) await deptCheckbox.check().catch(() => {})

  await page.getByRole('button', { name: /create|save|add staff/i }).last().click()
  await page.waitForTimeout(2500)

  // The account exists and is usable immediately — no verification email, per the 26A exception.
  expect(await canAuthenticate(staff.username, staff.password), 'the new staff account must be ACTIVE on creation').toBe(true)

  // And the staff list now shows them, without ever showing a credential.
  await page.goto(`${QA_BASE}/university/staff`, { waitUntil: 'networkidle' })
  await settle(page)
  const body = await page.evaluate(() => document.body.innerText)
  expect(body).toContain(staff.email)
  expect(body, 'a staff list must never render a password').not.toContain(staff.password)

  // Finally: they sign in through the ordinary form and land in the university portal, not the
  // admin console their creator uses. Creating an account does not donate the creator's access.
  await page.context().clearCookies()
  await signIn(page, { ...staff, loginId: staff.username, loginKind: 'username', role: 'DEPARTMENT_COORDINATOR', scope: '', label: '' } as QaAccount)
  expect(new URL(page.url()).pathname).toMatch(/^\/university\//)
})

test('the staff form refuses a role the tenant admin may not assign', async () => {
  // Driven at the API because the UI deliberately never offers these options — which is exactly why
  // the server-side refusal is the one that matters (frontend hiding is not authorization).
  const admin = account('UNIVERSITY_ADMIN', 'Alpha')
  const own = entity('University', 'Alpha')
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.loginId, password: admin.password }),
  })
  const { accessToken } = await res.json()
  const staff = newStaff('escalate')

  const attempt = await fetch(`${API}/universities/${own.id}/staff`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...staff, confirmPassword: staff.password, role: 'SUPER_ADMIN', departmentIds: [] }),
  })
  expect(attempt.ok, 'a university admin must not be able to mint a SUPER_ADMIN').toBe(false)
  expect(await canAuthenticate(staff.username, staff.password), 'the refused account must not exist').toBe(false)
})

test('a mismatched password confirmation is refused with a stable code', async () => {
  const admin = account('ORGANIZATION_ADMIN', 'Alpha')
  const own = entity('Organization', 'Alpha')
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.loginId, password: admin.password }),
  })
  const { accessToken } = await res.json()
  const staff = newStaff('mismatch')

  const attempt = await fetch(`${API}/organizations/${own.id}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...staff, confirmPassword: `${staff.password}X`, role: 'RECRUITER' }),
  })
  expect(attempt.ok).toBe(false)
  const body = await attempt.json()
  // Machine-readable, per section 11 — the frontend must never parse English to know what happened.
  expect(typeof body.code, 'the error must carry a stable code').toBe('string')
  expect(body.code).not.toBe('')
  expect(await canAuthenticate(staff.username, staff.password), 'no account may be left behind').toBe(false)
})
